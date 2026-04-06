# MeetScribe 🎙️

> **AI-powered meeting transcription and automated Minutes of Meeting (MoM) generation — built on AWS + Salesforce.**

MeetScribe captures live audio from a Salesforce Lightning Web Component, streams it over WebSockets to a Node.js server on AWS, transcribes it in real time using **Amazon Transcribe Streaming** (with automatic multilingual detection for 10 Indian languages), and then generates structured meeting minutes using **Claude on Amazon Bedrock** — all delivered back into the Salesforce UI.

---

## ✨ Features

- 🎤 **Live audio capture** via browser MediaRecorder API inside a Salesforce LWC
- 🌐 **Real-time transcription** using Amazon Transcribe Streaming
- 🌏 **Multilingual support** — auto-detects English, Hindi, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, and Punjabi
- 🤖 **AI-generated MoM** — Claude on Amazon Bedrock produces a clean HTML summary with discussion points and action items
- 💾 **Recording storage** — MP3 audio uploaded to Amazon S3
- 📧 **Email delivery** — send the meeting minutes directly from Salesforce
- 🔗 **CRM-linked** — meetings are tied to Salesforce Contact or Lead records
- ✅ **Consent gate** — built-in recording consent acknowledgement before any session starts

---

## 🏗️ Architecture

```
Salesforce LWC (browser)
  │  MediaRecorder → binary audio chunks
  │  WebSocket (wss://)
  ▼
Node.js WebSocket Server (EC2 / ECS)
  │  FFmpeg — audio normalisation → 16kHz PCM
  │  AWS Transcribe Streaming — live captions + language detection
  │  Amazon Bedrock (Claude) — MoM generation
  │  Amazon S3 — MP3 recording storage
  ▼
Salesforce LWC (browser)
  │  Receives transcript chunks + final MoM JSON
  │  Creates Meeting__c record via Apex
  │  Sends email via Apex
```

---

## 📁 Repository Structure

```
meetscribe/
├── server/                         # Node.js WebSocket + HTTP server
│   ├── server.js                   # Main entry point
│   ├── package.json
│   └── .env.example                # Environment variable template
│
└── salesforce/
    └── meetScribeComponent/        # Lightning Web Component
        ├── meetScribeComponent.html
        ├── meetScribeComponent.js
        └── meetScribeComponent.css
```

---

## 🚀 Getting Started

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| FFmpeg | 6 + |
| AWS account | — |
| Salesforce org | Developer / Sandbox |
| Salesforce CLI (`sf`) | Latest |

---

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/meetscribe.git
cd meetscribe
```

---

### 2. Set up the Node.js server

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your AWS details
```

**Required `.env` values:**

| Variable | Description |
|----------|-------------|
| `AWS_REGION` | Your primary AWS region (e.g. `us-east-1`) |
| `TRANSCRIBE_REGION` | Region for Amazon Transcribe |
| `BEDROCK_REGION` | Region for Amazon Bedrock |
| `BEDROCK_MODEL_ID` | Cross-region inference profile ID for Claude |
| `RECORDINGS_BUCKET` | S3 bucket name for MP3 uploads |
| `FFMPEG_PATH` | Absolute path to FFmpeg binary |

**AWS IAM permissions required:**

```json
{
  "Effect": "Allow",
  "Action": [
    "transcribe:StartStreamTranscription",
    "bedrock:InvokeModel",
    "s3:PutObject"
  ],
  "Resource": "*"
}
```

**Run locally:**

```bash
node server.js
# Server listening on ws://localhost:8080
```

**Health check:**

```bash
curl http://localhost:8080/health
# {"status":"ok"}
```

---

### 3. Deploy to AWS (EC2 / ECS)

```bash
# On EC2 — run with PM2 for process management
npm install -g pm2
pm2 start server.js --name meetscribe
pm2 save
pm2 startup

# Open port 8080 (or 443 with TLS termination via ALB/nginx)
```

> **Tip:** Put an Application Load Balancer in front with an ACM certificate so the LWC can connect over `wss://` (required for HTTPS Salesforce pages).

---

### 4. Deploy the Salesforce LWC

```bash
cd salesforce

# Authorise your org
sf org login web --alias my-org

# Deploy the component
sf project deploy start --source-dir meetScribeComponent --target-org my-org
```

**Salesforce setup checklist:**

- [ ] Create a **Static Resource** named `MeetScribe` containing `assets/mic.png` and `assets/pen.png`
- [ ] Create all **Custom Labels** referenced in `meetScribeComponent.js` (see table below)
- [ ] Add your WebSocket endpoint URL to **CSP Trusted Sites** and **Remote Site Settings**
- [ ] Create the `Meeting__c` custom object with fields: `Title__c`, `Summary__c`, `RecordingId__c`, `ParticipantId__c`, `CallStartTime__c`, `CallEndTime__c`
- [ ] Deploy the companion Apex class `MeetScribeController` with methods: `createMeetingRecord`, `sendEmail`, `searchContactsAndLeads`

**Custom Labels needed:**

| Label API Name | Example Value |
|----------------|---------------|
| `MeetScribeWebSocketUrl` | `wss://your-server.example.com` |
| `MeetScribeAppTitle` | `MeetScribe` |
| `MeetScribeSetupTitle` | `New Meeting` |
| `MeetScribeTagLine` | `Record, transcribe and summarise in real time.` |
| `MeetScribeStartBtn` | `Start Recording` |
| `MeetScribeStopBtn` | `Stop Recording` |
| `MeetScribeConnectingMessage` | `Connecting to server…` |
| `MeetScribeLiveTranscriptTitle` | `Live Transcript` |
| `MeetScribeSummaryTitle` | `Meeting Minutes` |
| `MeetScribeCallTitle` | `Call Title` |
| `MeetScribeSendEmailTitle` | `Send Minutes` |
| `MeetScribeGeneratingTitle` | `Generating meeting minutes, please wait…` |
| `MeetScribeDisclaimerEnglish` | *(your consent disclaimer in English)* |
| `MeetScribeDisclaimerHindi` | *(your consent disclaimer in Hindi)* |

---

## 🔒 Security Notes

- The `.env` file is listed in `.gitignore` — **never commit it**
- Use IAM roles on EC2 (not hardcoded access keys) for AWS credentials
- Rotate credentials regularly; use AWS Secrets Manager for production
- Enable S3 bucket encryption and restrict bucket policy to the server's IAM role
- All audio is processed in-memory and discarded after upload — no persistent local storage

---

## 🧰 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Salesforce Lightning Web Component (LWC) |
| Transport | WebSocket (ws / wss) |
| Audio processing | FFmpeg (PCM normalisation + MP3 conversion) |
| Speech-to-text | Amazon Transcribe Streaming |
| AI / LLM | Claude via Amazon Bedrock |
| Object storage | Amazon S3 |
| Server runtime | Node.js 18, `ws` library |
| CRM | Salesforce (Apex, Custom Objects, Custom Labels) |

---

## 🛣️ Roadmap

- [ ] Speaker diarisation (identify multiple speakers in transcript)
- [ ] Sentiment analysis per speaker turn
- [ ] Salesforce Flow integration to trigger post-call automations
- [ ] Support for additional regional languages
- [ ] Docker / ECS Fargate deployment template
- [ ] Unit tests for server-side audio pipeline

---

## 🤝 Contributing

Pull requests are welcome. For major changes please open an issue first to discuss the proposed change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Open a Pull Request

---

## 📄 License

[MIT](LICENSE)

---

## 👤 Author

Built by Me, a Senior Software Engineer specialising in AWS + Salesforce integrations and GenAI application development.

---

*MeetScribe — because every meeting deserves a record.*
