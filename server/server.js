const http = require('http');
const WebSocket = require('ws');
const { spawn } = require('child_process');
const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require('@aws-sdk/client-transcribe-streaming');
const { PassThrough } = require('stream');
const { defaultProvider } = require('@aws-sdk/credential-provider-node');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config();

// ---- AWS Clients (configure via .env) ----
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
});

// ---- Helper: single pending drain waiter per stream ----
function createDrainWaiter() {
  const pending = new WeakMap();
  return function waitForDrain(stream) {
    const state = pending.get(stream);
    if (state) return state.promise;
    let resolveFn;
    const p = new Promise((res) => { resolveFn = res; });
    pending.set(stream, { promise: p, resolve: resolveFn });
    stream.once('drain', () => {
      const s = pending.get(stream);
      if (!s) return;
      try { s.resolve(); } catch (e) {}
      pending.delete(stream);
    });
    return p;
  };
}
const waitForDrain = createDrainWaiter();

// ---- HTTP server / health ----
function createHttpServer() {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('MeetScribe WebSocket server is running.\n');
  });
}

// ---- FFmpeg audio processing ----
function handleFFmpeg(audioInputStream) {
  const ffmpegPath = process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg';
  const ffmpeg = spawn(ffmpegPath, [
    '-i', 'pipe:0',
    '-ar', '16000',
    '-ac', '1',
    '-f', 's16le',
    'pipe:1',
  ]);

  try {
    if (ffmpeg.stdin?.setMaxListeners) ffmpeg.stdin.setMaxListeners(50);
    if (ffmpeg.stdout?.setMaxListeners) ffmpeg.stdout.setMaxListeners(50);
  } catch (e) { /* ignore */ }

  const CHUNK_SIZE = 800;
  let buffer = Buffer.alloc(0);

  ffmpeg.stderr.on('data', (d) => {
    console.log('FFmpeg stderr:', String(d).replace(/\n/g, ' | '));
  });

  ffmpeg.stdout.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);
    while (buffer.length >= CHUNK_SIZE) {
      const chunk = buffer.slice(0, CHUNK_SIZE);
      buffer = buffer.slice(CHUNK_SIZE);
      const ok = audioInputStream.write(chunk);
      if (!ok) {
        ffmpeg.stdout.pause();
        (async () => {
          try {
            await waitForDrain(audioInputStream);
            try { ffmpeg.stdout.resume(); } catch (e) {}
          } catch (e) { /* no-op */ }
        })();
      }
    }
  });

  ffmpeg.stdout.on('end', () => {
    if (buffer.length > 0) audioInputStream.write(buffer);
    audioInputStream.end();
    console.log('FFmpeg stdout ended');
  });

  ffmpeg.on('close', () => {
    try { if (!audioInputStream.destroyed) audioInputStream.end(); } catch (e) {}
    console.log('FFmpeg process closed');
  });

  ffmpeg.on('error', (err) => {
    console.error('FFmpeg spawn error:', err);
  });

  return ffmpeg;
}

// ---- Supported Indian languages (configurable) ----
const LANGUAGE_DISPLAY_NAMES = {
  'en-IN': 'English (India)',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'pa-IN': 'Punjabi',
};

const LANGUAGE_OPTIONS = Object.keys(LANGUAGE_DISPLAY_NAMES);

// ---- AWS Transcribe Streaming ----
function startTranscription(audioInputStream, ws) {
  const client = new TranscribeStreamingClient({
    region: process.env.TRANSCRIBE_REGION || process.env.AWS_REGION || 'us-east-1',
    credentials: defaultProvider(),
  });
  const MAX_SEND_SIZE = 1024;

  const command = new StartStreamTranscriptionCommand({
    IdentifyMultipleLanguages: true,
    LanguageOptions: LANGUAGE_OPTIONS.join(','),
    PreferredLanguage: process.env.PREFERRED_LANGUAGE || 'en-IN',
    MediaEncoding: 'pcm',
    MediaSampleRateHertz: 16000,
    AudioStream: (async function* () {
      for await (const chunk of audioInputStream) {
        let offset = 0;
        while (offset < chunk.length) {
          const end = Math.min(offset + MAX_SEND_SIZE, chunk.length);
          const sub = chunk.slice(offset, end);
          yield { AudioEvent: { AudioChunk: sub } };
          offset = end;
        }
      }
    })(),
  });

  let fullTranscript = '';
  let detectedLanguageCode = null;
  let resolveDone;
  const done = new Promise((r) => (resolveDone = r));

  (async () => {
    try {
      const response = await client.send(command);
      for await (const event of response.TranscriptResultStream) {
        if (event.TranscriptEvent) {
          const results = event.TranscriptEvent.Transcript.Results;
          if (results.length && results[0].Alternatives.length) {
            const result = results[0];
            const transcript = result.Alternatives[0].Transcript;
            const langCode = result.LanguageCode || null;

            if (!result.IsPartial) {
              if (langCode && detectedLanguageCode !== langCode) {
                detectedLanguageCode = langCode;
                const displayName = LANGUAGE_DISPLAY_NAMES[langCode] || langCode;
                console.log(`Detected language: ${displayName} (${langCode})`);
                ws.send(JSON.stringify({
                  type: 'language_detected',
                  languageCode: langCode,
                  languageLabel: displayName,
                }));
              }
              ws.send(JSON.stringify({ transcript, languageCode: langCode }));
              fullTranscript += transcript + ' ';
            }
          }
        }
      }
    } catch (err) {
      console.error('Transcribe error:', err);
    } finally {
      resolveDone();
    }
  })();

  return {
    getTranscript: () => fullTranscript.trim(),
    getDetectedLanguage: () => detectedLanguageCode,
    done,
  };
}

// ---- Utilities ----
function chunkText(text, size = 12000, overlap = 400) {
  const chunks = [];
  for (let i = 0; i < text.length; i += size - overlap) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}

async function explainBedrockError(e) {
  return JSON.stringify({
    name: e.name || e.Code || 'UnknownError',
    message: e.message || e.Message || '',
    metadata: e.$metadata || null,
  });
}

// ---- Claude via Amazon Bedrock ----
async function callClaude(userText, { maxTokens = 900, temperature = 0.3 } = {}) {
  const modelId = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-5';

  const body = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    temperature,
    messages: [{ role: 'user', content: [{ type: 'text', text: userText }] }],
  };

  const cmd = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify(body),
  });

  try {
    const resp = await bedrockClient.send(cmd);
    const txt = new TextDecoder().decode(resp.body);
    const parsed = JSON.parse(txt);
    const out = parsed?.content?.[0]?.text ?? '';
    console.log('Claude output (preview):', out.substring(0, 200) + '...');
    return out;
  } catch (e) {
    try { console.error('Bedrock error:', await explainBedrockError(e)); } catch {}
    throw e;
  }
}

function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

// ---- MOM / Meeting Minutes Generation ----
async function generateMeetingMinutes(transcript) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 330); // IST offset
  const currentDateTime = date.toLocaleString();

  const prompt = `You are a professional executive assistant. Generate concise Meeting Minutes from the call transcript below.
Return ONLY a valid JSON object with exactly two keys:
{
  "title": "Brief, specific title describing this call (e.g., 'Q2 Sales Review – April 3, 2025')",
  "mom": "<HTML string>"
}

The "mom" HTML must follow this structure in order:
<br><h4>Summary</h4>
<p>2–3 sentences covering what was discussed and the outcome.</p>

<h4>Discussion Points</h4>
<ul><li>Concise point</li></ul>

<h4>Action Items</h4>
<table style="width:100%;border-collapse:collapse;">
  <tr style="background:#f5f5f5;">
    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Task</th>
    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Owner</th>
    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Deadline</th>
  </tr>
</table>
<!-- If none: <p><em>No action items identified.</em></p> -->

<p style="margin-top:16px;color:#888;font-size:0.85em;">Generated: ${currentDateTime}</p>

Rules:
- Write in English. Translate any non-English content.
- Be concise — no filler words, no repetition.
- Output ONLY the JSON object. No extra text, no markdown fences.

Transcript:
${JSON.stringify(transcript)}`;

  return callClaude(prompt, { maxTokens: 3000, temperature: 0.2 });
}

// ---- Audio conversion to MP3 ----
function convertToMp3(inputBuffer) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = process.env.FFMPEG_PATH || '/usr/local/bin/ffmpeg';
    const ffmpeg = spawn(ffmpegPath, [
      '-i', 'pipe:0',
      '-ar', '44100',
      '-ac', '1',
      '-f', 'mp3',
      'pipe:1',
    ]);
    const chunks = [];
    ffmpeg.stdout.on('data', (chunk) => chunks.push(chunk));
    ffmpeg.stdout.on('end', () => resolve(Buffer.concat(chunks)));
    ffmpeg.stderr.on('data', () => {});
    ffmpeg.on('error', reject);
    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}

// ---- S3 Upload ----
async function uploadAudioToS3(audioBuffer) {
  const bucket = process.env.RECORDINGS_BUCKET;
  if (!bucket) {
    console.warn('RECORDINGS_BUCKET not set, skipping S3 upload.');
    return null;
  }
  const prefix = process.env.RECORDINGS_PREFIX || 'recordings';
  const fileName = `${prefix}/meeting-${Date.now()}.mp3`;
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: audioBuffer,
      ContentType: 'audio/mpeg',
    }));
    console.log('Audio uploaded to S3:', fileName);
    return fileName;
  } catch (error) {
    console.error('Error uploading audio to S3:', error);
    return null;
  }
}

// ---- WebSocket connection handler ----
function handleWebSocketConnection(ws) {
  const receivedAudioChunks = [];
  const audioInputStream = new PassThrough();
  const ffmpeg = handleFFmpeg(audioInputStream);
  const transcribe = startTranscription(audioInputStream, ws);

  ws.send(JSON.stringify({ message: 'Connection established. Ready to record.' }));

  ws.on('message', async (message) => {
    const isBinary = Buffer.isBuffer(message);

    // Check for control message (end signal)
    try {
      const parsed = JSON.parse(message.toString('utf8'));
      if (parsed?.end === true) {
        console.log('Received end signal from client');
        setTimeout(() => ffmpeg.stdin.end(), 3000);
        await transcribe.done;

        const audioBuffer = Buffer.concat(receivedAudioChunks);
        const mp3Buffer = await convertToMp3(audioBuffer);
        const audioFileId = await uploadAudioToS3(mp3Buffer);
        const transcript = transcribe.getTranscript();
        const detectedLang = transcribe.getDetectedLanguage();
        const momJsonString = await generateMeetingMinutes(transcript);

        ws.send(JSON.stringify({
          type: 'mom',
          content: momJsonString,
          recordingid: audioFileId,
          languageCode: detectedLang,
          languageLabel: detectedLang
            ? (LANGUAGE_DISPLAY_NAMES[detectedLang] || detectedLang)
            : null,
        }));

        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) ws.close();
        }, 1000);
        return;
      }
    } catch (e) {
      // Not JSON — treat as binary audio data
    }

    if (isBinary) {
      const buf = Buffer.isBuffer(message) ? message : Buffer.from(message);
      receivedAudioChunks.push(buf);
      try {
        const ok = ffmpeg.stdin.write(buf);
        if (!ok) await waitForDrain(ffmpeg.stdin);
      } catch (err) {
        console.error('Error writing to ffmpeg.stdin:', err);
      }
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    setTimeout(() => {
      try { ffmpeg.stdin.end(); } catch (e) {}
    }, 3000);
    try { audioInputStream.end(); } catch (e) {}
  });
}

// ---- Bootstrap ----
function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });
  wss.on('connection', handleWebSocketConnection);
}

const PORT = process.env.PORT || 8080;
const server = createHttpServer();
createWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`MeetScribe server running on port ${PORT}`);
});
