# FieldView — Live Camera + GPS Operations Dashboard

**FieldView** is a production-quality, serverless real-time operations dashboard. A field device (mobile smartphone) streams live 1080p landscape camera video and high-precision GPS telemetry over PeerJS (WebRTC) directly to a central operations dashboard opened on a desktop or laptop computer.

Zero custom backend servers or WebSockets are required—the application deploys out-of-the-box on Vercel as pure static client routes with dynamic WebRTC mesh signaling.

---

## System Architecture & Features

### 1. WebRTC & Telemetry Pipeline
- **Signaling & P2P Stream:** Built with PeerJS over WebRTC. The dashboard acts as a host (`fieldview-<code>`), while the mobile device acts as an ad-hoc field streamer.
- **Resilient ICE / STUN / TURN:** Pre-configured with Google and Twilio public STUN servers. Optional TURN credentials can be configured via environment variables for restrictive cellular carrier NAT networks (CGNAT).
- **Auto-Reconnect & State Machine:** Exponential backoff reconnection for packet loss or network transitions (e.g. WiFi to 5G). Connection states: `Waiting`, `Connecting`, `Live`, `Reconnecting`, `Disconnected`.
- **Bidirectional Data Channel:** Transmits `{ lat, lng, accuracy, speed, heading, timestamp }` at a sampled ~1Hz cadence. Features automated RTT latency ping/pong calculation.

### 2. Desktop Operations Dashboard (`/`)
- **Strict 16:9 Live Video Panel:** Deep-black container with `object-contain`, real-time millisecond/UTC time overlay, fullscreen mode, and 1-click **Snapshot capture** that stamps telemetry and downloads watermarked PNG imagery.
- **Interactive Geospatial Map (Leaflet):**
  - Live device marker with pulsing radar reticle and directional heading arrow.
  - Accuracy radius circle scaled to the GPS fix (meters).
  - Breadcrumb trail path history with auto-pruning.
  - Layer toggle between OpenStreetMap (Street) and Esri World Imagery (Satellite).
  - **"Follow Device"** toggle for hands-free tracking.
  - **"Drop Pin" Mode:** Click anywhere to drop custom tactical markers (Checkpoint, Target, Danger, Observation, Generic). Right-click to delete.
- **Geospatial Markers Management:**
  - Live real-time distance from the field device computed via the **Haversine formula**.
  - One-click map centering ("Fly to").
  - Persistent storage in browser `localStorage`.
  - Full **Export GeoJSON** and **Import GeoJSON** support.
- **Real-Time Telemetry Card:** Tabular typography displaying Latitude, Longitude, Accuracy tier, Ground Speed (km/h & mph), Heading, and Stale signal detection.

### 3. Mobile Streaming Page (`/camera`)
- **Effortless Pairing:** Automatically pairs via QR scan or URL parameter `?s=<code>`.
- **Camera Configuration:** Rear camera (`facingMode: "environment"`), ideal 1080p (1920x1080) @ 30 FPS, 16:9 aspect ratio, audio disabled by default.
- **Seamless Camera Flip:** Toggle front/back cameras using `RTCRtpSender.replaceTrack` without tearing down the WebRTC connection.
- **Hardware Torch / Flashlight:** Hardware flashlight toggle if supported by the device.
- **Screen Wake Lock API:** Prevents mobile display sleep during live streaming operations.
- **Orientation Guide:** Prompts operator to rotate device to landscape orientation.
- **Strict HTTPS Guards:** Displays actionable error guidance if opened on insecure HTTP contexts.

---

## Tech Stack
- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (Tactical Operations dark theme, Inter UI, JetBrains Mono numbers)
- **WebRTC Engine:** PeerJS (Client-only with SSR disabled)
- **Mapping:** Leaflet & react-leaflet with OpenStreetMap & Esri World Imagery
- **Icons & QR:** Lucide React & qrcode.react

---

## Getting Started

### Prerequisites
- Node.js 18+ (tested with Node 20 / 22 / 24)
- npm or pnpm or yarn

### 1. Installation
```bash
git clone https://github.com/your-username/fieldview.git
cd fieldview
npm install
```

### 2. Configure Environment Variables (Optional)
Copy the example environment file:
```bash
cp .env.example .env.local
```
FieldView works out-of-the-box with built-in Google and Twilio public STUN servers. If your mobile device streams across restrictive carrier NATs or mobile data firewalls, you can add TURN credentials in `.env.local`:
```env
NEXT_PUBLIC_TURN_URL=turn:your-turn-server.com:3478
NEXT_PUBLIC_TURN_USER=your-turn-username
NEXT_PUBLIC_TURN_PASS=your-turn-password
```

---

## Local Development & Phone Testing

> **CRITICAL SECURITY NOTE:**
> Modern mobile browsers (iOS Safari, Android Chrome) strictly require an **HTTPS** context to grant access to the Camera (`getUserMedia`) and GPS Location (`navigator.geolocation`). Plain `http://<lan-ip>:3000` will fail with permission/security errors on mobile devices.

### Method A: Next.js Built-in Experimental HTTPS (Recommended for LAN)
Run Next.js with self-signed SSL certificates:
```bash
npm run dev -- --experimental-https
```
1. Open `https://localhost:3000` on your desktop dashboard.
2. Accept the local self-signed certificate in your desktop browser.
3. Open the pairing modal on your desktop, and scan the QR code with your phone (or browse to `https://<YOUR_LAN_IP>:3000/camera?s=<code>`).
4. On your phone, tap "Advanced" -> "Proceed anyway" to trust the local SSL certificate.
5. Tap **"START STREAMING"**.

### Method B: Tunneling via ngrok (Easiest for Mobile Data Testing)
1. In terminal 1, start the standard dev server:
   ```bash
   npm run dev
   ```
2. In terminal 2, launch an ngrok HTTPS tunnel:
   ```bash
   npx ngrok http 3000
   ```
3. Open the HTTPS ngrok URL on your desktop (e.g. `https://xxxx.ngrok-free.app`).
4. Scan the pairing QR code with your smartphone. Because ngrok provides a trusted HTTPS certificate, mobile permissions work automatically.

---

## Production Deployment to Vercel

FieldView is architected to require zero custom backend servers or WebSockets. It deploys directly to [Vercel](https://vercel.com) with automatic HTTPS:

1. Push your repository to GitHub / GitLab / Bitbucket.
2. Import the project into the [Vercel Dashboard](https://vercel.com/new).
3. (Optional) In the **Environment Variables** section, add your `NEXT_PUBLIC_TURN_*` variables if using a custom TURN server.
4. Click **Deploy**.
5. Once deployed, open the Vercel URL on your laptop/desktop, scan the QR code with your phone, and start streaming!

---

## Verification & Type Safety

Run production build and linter to verify zero TypeScript or syntax issues:
```bash
# Type check and production bundle compilation
npm run build

# Zero-warning lint check
npm run lint
```

---

## Operations Guide

| Action | Control / Location |
| :--- | :--- |
| **Pair Phone** | Scan QR code on dashboard home or click `Pair Phone` in top bar. |
| **Switch Camera** | Tap refresh/flip icon in bottom-right corner of `/camera`. |
| **Toggle Flashlight** | Tap lightning icon in `/camera` (if supported by device lens). |
| **Capture Snapshot** | Click camera icon on live video player; exports watermarked PNG with telemetry. |
| **Drop Marker** | Toggle `DROP PIN` on map toolbar, then click anywhere on map. |
| **Delete Marker** | Right-click the pin on map or click the trash icon in the markers panel. |
| **Fly To Target** | Click crosshair icon next to any marker in the list to center map. |
| **Export / Import** | Use `EXPORT` and `IMPORT` buttons on the markers panel for GeoJSON format. |
