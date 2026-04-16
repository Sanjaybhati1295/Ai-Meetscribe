<img width="200" height="150" alt="meetscribe_architecture" src="https://github.com/user-attachments/assets/b26c0a31-2541-4eff-b683-6cfa98852306" /># MeetScribe 🎙️

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
![U<svg width="100%" viewBox="0 0 680 510" role="img" xmlns="http://www.w3.org/2000/svg">
<title style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">MeetScribe system architecture</title>
<desc style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">Salesforce LWC connects through AWS Route 53, ACM, ALB, and Target Group to an EC2 WebSocket server, which streams to AWS Transcribe for speech-to-text, stores recordings in S3, and generates meeting minutes via Amazon Bedrock</desc>
<defs>
  <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </marker>
<mask id="imagine-text-gaps-ocwvn1" maskUnits="userSpaceOnUse"><rect x="0" y="0" width="680" height="510" fill="white"/><rect x="54" y="106.19445037841797" width="70.78341674804688" height="19.11111831665039" fill="black" rx="2"/><rect x="283.74566650390625" y="28.263891220092773" width="112.50867462158203" height="21.47222137451172" fill="black" rx="2"/><rect x="212.37744140625" y="49.4444465637207" width="255.24522399902344" height="19.111114501953125" fill="black" rx="2"/><rect x="126.64106750488281" y="127.26390075683594" width="66.71788024902344" height="21.47222137451172" fill="black" rx="2"/><rect x="92.62630462646484" y="146.4444580078125" width="134.7473907470703" height="19.11111068725586" fill="black" rx="2"/><rect x="499.1365051269531" y="127.26390075683594" width="41.72699737548828" height="21.47222137451172" fill="black" rx="2"/><rect x="459.6395568847656" y="146.4444580078125" width="120.72091674804688" height="19.11111068725586" fill="black" rx="2"/><rect x="108.23979187011719" y="217.26388549804688" width="143.52040100097656" height="21.47222137451172" fill="black" rx="2"/><rect x="103.91600036621094" y="236.4444580078125" width="152.16796875" height="19.11111068725586" fill="black" rx="2"/><rect x="454.26739501953125" y="217.26388549804688" width="91.46527862548828" height="21.47222137451172" fill="black" rx="2"/><rect x="431.9770202636719" y="236.4444580078125" width="136.04600524902344" height="19.11111068725586" fill="black" rx="2"/><rect x="251.24722290039062" y="312.263916015625" width="177.50563049316406" height="21.47222137451172" fill="black" rx="2"/><rect x="237.46424865722656" y="333.4444580078125" width="205.0716094970703" height="19.11111068725586" fill="black" rx="2"/><rect x="68.8010025024414" y="411.2638854980469" width="112.39800262451172" height="21.47222137451172" fill="black" rx="2"/><rect x="80.6545181274414" y="430.4444580078125" width="88.69097137451172" height="19.11111068725586" fill="black" rx="2"/><rect x="299.3622131347656" y="411.2638854980469" width="81.27560424804688" height="21.47222137451172" fill="black" rx="2"/><rect x="284.5942077636719" y="430.4444580078125" width="110.81163024902344" height="19.11111068725586" fill="black" rx="2"/><rect x="494.46246337890625" y="411.2638854980469" width="121.07508087158203" height="21.47222137451172" fill="black" rx="2"/><rect x="485.13238525390625" y="430.4444580078125" width="139.73524475097656" height="19.11111068725586" fill="black" rx="2"/><rect x="640.030029296875" y="169.1527862548828" width="43.97005081176758" height="17.694443702697754" fill="black" rx="2"/></mask></defs>

<rect x="40" y="104" width="600" height="362" rx="14" fill="none" stroke="var(--color-border-secondary)" stroke-width="1" stroke-dasharray="6 4" style="fill:none;stroke:rgba(31, 30, 29, 0.3);color:rgb(0, 0, 0);stroke-width:1px;stroke-dasharray:6px, 4px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<text x="58" y="120" style="fill:rgb(61, 61, 58);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:start;dominant-baseline:auto">AWS Cloud</text>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="190" y="20" width="300" height="56" rx="8" stroke-width="0.5" style="fill:rgb(238, 237, 254);stroke:rgb(83, 74, 183);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="340" y="39" text-anchor="middle" dominant-baseline="central" style="fill:rgb(60, 52, 137);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Salesforce LWC</text>
  <text x="340" y="59" text-anchor="middle" dominant-baseline="central" style="fill:rgb(83, 74, 183);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Audio capture, transcription UI, MOM editor</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="60" y="124" width="200" height="44" rx="8" stroke-width="0.5" style="fill:rgb(230, 241, 251);stroke:rgb(24, 95, 165);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="160" y="138" text-anchor="middle" dominant-baseline="central" style="fill:rgb(12, 68, 124);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Route 53</text>
  <text x="160" y="156" text-anchor="middle" dominant-baseline="central" style="fill:rgb(24, 95, 165);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Custom domain + DNS</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="420" y="124" width="200" height="44" rx="8" stroke-width="0.5" style="fill:rgb(230, 241, 251);stroke:rgb(24, 95, 165);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="520" y="138" text-anchor="middle" dominant-baseline="central" style="fill:rgb(12, 68, 124);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">ACM</text>
  <text x="520" y="156" text-anchor="middle" dominant-baseline="central" style="fill:rgb(24, 95, 165);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">SSL / TLS certificate</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="60" y="214" width="240" height="44" rx="8" stroke-width="0.5" style="fill:rgb(230, 241, 251);stroke:rgb(24, 95, 165);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="180" y="228" text-anchor="middle" dominant-baseline="central" style="fill:rgb(12, 68, 124);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Load balancer (ALB)</text>
  <text x="180" y="246" text-anchor="middle" dominant-baseline="central" style="fill:rgb(24, 95, 165);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">HTTPS + WSS termination</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="380" y="214" width="240" height="44" rx="8" stroke-width="0.5" style="fill:rgb(230, 241, 251);stroke:rgb(24, 95, 165);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="500" y="228" text-anchor="middle" dominant-baseline="central" style="fill:rgb(12, 68, 124);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Target group</text>
  <text x="500" y="246" text-anchor="middle" dominant-baseline="central" style="fill:rgb(24, 95, 165);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Health check + routing</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="190" y="304" width="300" height="56" rx="8" stroke-width="0.5" style="fill:rgb(225, 245, 238);stroke:rgb(15, 110, 86);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="340" y="323" text-anchor="middle" dominant-baseline="central" style="fill:rgb(8, 80, 65);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">EC2 — WebSocket server</text>
  <text x="340" y="343" text-anchor="middle" dominant-baseline="central" style="fill:rgb(15, 110, 86);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Audio relay + transcription pipeline</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="40" y="408" width="170" height="44" rx="8" stroke-width="0.5" style="fill:rgb(250, 236, 231);stroke:rgb(153, 60, 29);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="125" y="422" text-anchor="middle" dominant-baseline="central" style="fill:rgb(113, 43, 19);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">AWS Transcribe</text>
  <text x="125" y="440" text-anchor="middle" dominant-baseline="central" style="fill:rgb(153, 60, 29);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Streaming STT</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="255" y="408" width="170" height="44" rx="8" stroke-width="0.5" style="fill:rgb(250, 238, 218);stroke:rgb(133, 79, 11);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="340" y="422" text-anchor="middle" dominant-baseline="central" style="fill:rgb(99, 56, 6);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Amazon S3</text>
  <text x="340" y="440" text-anchor="middle" dominant-baseline="central" style="fill:rgb(133, 79, 11);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Recording storage</text>
</g>

<g style="fill:rgb(0, 0, 0);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto">
  <rect x="470" y="408" width="170" height="44" rx="8" stroke-width="0.5" style="fill:rgb(250, 236, 231);stroke:rgb(153, 60, 29);color:rgb(0, 0, 0);stroke-width:0.5px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
  <text x="555" y="422" text-anchor="middle" dominant-baseline="central" style="fill:rgb(113, 43, 19);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:14px;font-weight:500;text-anchor:middle;dominant-baseline:central">Amazon Bedrock</text>
  <text x="555" y="440" text-anchor="middle" dominant-baseline="central" style="fill:rgb(153, 60, 29);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:12px;font-weight:400;text-anchor:middle;dominant-baseline:central">Claude 3.5 — MOM gen</text>
</g>

<path d="M290,76 L290,102 L160,102 L160,124" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M160,168 L160,214" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M520,168 L520,192 L300,192 L300,214" fill="none" stroke="var(--color-border-secondary)" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.3);color:rgb(0, 0, 0);stroke-width:1px;stroke-dasharray:4px, 3px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M300,236 L380,236" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M500,258 L500,282 L340,282 L340,304" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

<path d="M260,360 L260,386 L125,386 L125,408" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M340,360 L340,408" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<path d="M420,360 L420,386 L555,386 L555,408" fill="none" stroke="var(--color-border-primary)" stroke-width="1" marker-end="url(#arrow)" marker-start="url(#arrow)" style="fill:none;stroke:rgba(31, 30, 29, 0.4);color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>

<path d="M490,304 L650,304 L650,48 L490,48" fill="none" stroke="var(--color-border-secondary)" stroke-width="1" stroke-dasharray="4 3" marker-end="url(#arrow)" mask="url(#imagine-text-gaps-ocwvn1)" style="fill:none;stroke:rgba(31, 30, 29, 0.3);color:rgb(0, 0, 0);stroke-width:1px;stroke-dasharray:4px, 3px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:16px;font-weight:400;text-anchor:start;dominant-baseline:auto"/>
<text x="644.03" y="178" dominant-baseline="central" style="font-size:11px;fill:rgb(61, 61, 58);stroke:none;color:rgb(0, 0, 0);stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;opacity:1;font-family:&quot;Anthropic Sans&quot;, -apple-system, &quot;system-ui&quot;, &quot;Segoe UI&quot;, sans-serif;font-size:11px;font-weight:400;text-anchor:start;dominant-baseline:central">results</text>
</svg>ploading meetscribe_architecture.svg…]()


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
