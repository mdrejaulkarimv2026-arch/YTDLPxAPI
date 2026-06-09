<div align="center">

<img src="https://raw.githubusercontent.com/yt-dlp/yt-dlp/master/.github/banner.svg" alt="YT-DLP API Server" width="640" />

# 🎬 DL-API — YT-DLP API Server

### *A blazing-fast, 24/7 production-ready YouTube downloader API with PO Token bypass, custom quality presets, and on-the-fly transcoding.*

[![Version](https://img.shields.io/badge/version-2.2.0-brightgreen?style=for-the-badge&logo=semver)](https://github.com/MohammadKobirShah/DL-API/releases)
[![Node](https://img.shields.io/badge/Node.js-%E2%89%A518-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-blue?style=for-the-badge)](LICENSE)
[![PM2 Ready](https://img.shields.io/badge/PM2-Ready-2B037A?style=for-the-badge&logo=pm2&logoColor=white)](https://pm2.keymetrics.io/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-Powered-007808?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![PO Token](https://img.shields.io/badge/PO%20Token-Bypass-ff4500?style=for-the-badge)](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)

[![GitHub Stars](https://img.shields.io/github/stars/MohammadKobirShah/DL-API?style=social)](https://github.com/MohammadKobirShah/DL-API/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/MohammadKobirShah/DL-API?style=social)](https://github.com/MohammadKobirShah/DL-API/network)
[![GitHub Issues](https://img.shields.io/github/issues/MohammadKobirShah/DL-API?style=social&logo=github)](https://github.com/MohammadKobirShah/DL-API/issues)

[**🚀 Quick Start**](#-quick-start) • [**🐳 Docker**](#-docker) • [**📚 API Docs**](#-api-endpoints) • [**🎨 Presets**](#-quality-presets) • [**🚢 Deploy**](#-deployment) • [**👨‍💻 Developer**](#-developer)

---

</div>

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

### 🎯 Core Capabilities
- 🔓 **PO Token bypass** via `bgutil-ytdlp-pot-provider`
- 🎵 **36+ quality presets** (audio + video)
- 🎬 **On-the-fly transcoding** via FFmpeg
- 📺 **15 public + 4 admin endpoints**
- 🍪 **Netscape + JSON cookie support**
- 🔁 **Auto PO Token refresh** (GitHub Actions, every 6h)
- 📊 **Real-time download progress**
- 🌐 **OEmbed-compatible** endpoint

</td>
<td width="50%" valign="top">

### ⚡ Production-Ready
- 🛡️ **SSRF-protected URL validation**
- 🚦 **Helmet + CORS + Morgan** security middleware
- 💾 **Persistent token/cookie storage**
- 🔄 **PM2 auto-restart** & graceful shutdown
- 📦 **Stream + save-to-disk** modes
- 🎚️ **Custom bitrate / CRF / resolution**
- ⏱️ **Configurable timeouts** & duration limits
- 🩺 **Health check** & status endpoints

</td>
</tr>
</table>

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [🚀 Quick Start](#-quick-start)
- [🐳 Docker](#-docker)
- [⚙️ Configuration](#️-configuration)
- [📚 API Endpoints](#-api-endpoints)
- [🎨 Quality Presets](#-quality-presets)
- [🍪 Cookies & PO Token](#-cookies--po-token)
- [🚢 Deployment](#-deployment)
- [🛠 Architecture](#-architecture)
- [📂 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📜 License](#-license)
- [👨‍💻 Developer](#-developer)

---

## 🛠 Tech Stack

| Layer            | Technology                                                                  |
| ---------------- | --------------------------------------------------------------------------- |
| **Runtime**      | Node.js ≥ 18                                                                |
| **Framework**    | Express 4                                                                   |
| **Engine**       | [yt-dlp](https://github.com/yt-dlp/yt-dlp)                                  |
| **Media**        | [FFmpeg](https://ffmpeg.org) + ffprobe                                      |
| **PO Token**     | [bgutil-ytdlp-pot-provider](https://github.com/Brainicism/bgutil-ytdlp-pot-provider) |
| **Security**     | Helmet, CORS, SSRF guards                                                   |
| **Process Mgmt** | PM2                                                                         |
| **CI/CD**        | GitHub Actions (auto PO Token refresh)                                      |

---

## 🚀 Quick Start

### One-line install (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - \
 && sudo apt install -y nodejs ffmpeg python3-pip \
 && sudo pip3 install yt-dlp \
 && sudo npm install -g bgutil-ytdlp-pot-provider pm2 \
 && git clone https://github.com/MohammadKobirShah/DL-API.git \
 && cd DL-API && npm install && cp .env.example .env \
 && pm2 start ecosystem.config.cjs
```

### Step-by-step

<details>
<summary><b>📦 1. Install Node.js 20</b></summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # v20.x.x
```
</details>

<details>
<summary><b>🎬 2. Install FFmpeg</b></summary>

| OS                | Command                              |
| ----------------- | ------------------------------------ |
| Ubuntu/Debian     | `sudo apt install -y ffmpeg`         |
| macOS             | `brew install ffmpeg`                |
| Windows (winget)  | `winget install Gyan.FFmpeg`         |
| Windows (choco)   | `choco install ffmpeg`               |
| Arch              | `sudo pacman -S ffmpeg`              |

Verify: `ffmpeg -version`
</details>

<details>
<summary><b>📥 3. Install yt-dlp</b></summary>

```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
yt-dlp --version
```
</details>

<details>
<summary><b>🔑 4. Install PO Token Provider</b></summary>

```bash
sudo npm install -g bgutil-ytdlp-pot-provider
```
</details>

<details>
<summary><b>🚀 5. Run the API</b></summary>

```bash
git clone https://github.com/MohammadKobirShah/DL-API.git
cd DL-API
npm install
cp .env.example .env
nano .env                   # tweak as needed
npm start                   # dev mode
# — or —
pm2 start ecosystem.config.cjs   # 24/7 production
pm2 save && pm2 startup
```
</details>

---

## 🐳 Docker

The fastest, zero-friction way to run DL-API — **everything bundled** (Node.js 20 + ffmpeg + yt-dlp **nightly**) on Debian Bookworm slim, with the official PO Token provider running as a **sidecar** container.

### 🚀 One-shot run with docker compose

```bash
git clone https://github.com/MohammadKobirShah/DL-API.git
cd DL-API
docker compose up -d
```

That's it. The API is live on **http://localhost:3000**. Compose spins up:

| Service           | Image                                         | Purpose                            |
| ----------------- | --------------------------------------------- | ---------------------------------- |
| `ytdlp-api`       | `dl-api:latest` (built from `Dockerfile`)     | The YT-DLP API server              |
| `bgutil-provider` | `brainicism/bgutil-ytdlp-pot-provider:latest` | PO Token generator (port 4416, internal) |

Bundled inside `ytdlp-api`:

| Component           | Version channel                                 |
| ------------------- | ----------------------------------------------- |
| Node.js             | 20 LTS                                          |
| FFmpeg / ffprobe    | Debian package (5.x)                            |
| yt-dlp              | **nightly** (`yt-dlp_linux` standalone binary)  |
| tini                | PID 1 init                                      |

### 🔧 Switch yt-dlp channel

```bash
# Nightly (default)
docker compose build --build-arg YTDLP_CHANNEL=nightly

# Master
docker compose build --build-arg YTDLP_CHANNEL=master

# Stable
docker compose build --build-arg YTDLP_CHANNEL=stable
```

### 🏛 Multi-arch support

The Dockerfile auto-detects architecture and pulls the right binary:

| Platform   | yt-dlp binary             |
| ---------- | ------------------------- |
| `amd64`    | `yt-dlp_linux`            |
| `arm64`    | `yt-dlp_linux_aarch64`    |
| `armhf`    | `yt-dlp_linux_armv7l`     |

### 📂 Volumes (auto-created on host)

| Host path        | Container path     | Purpose                          |
| ---------------- | ------------------ | -------------------------------- |
| `./data`         | `/app/data`        | PO Token + visitor + cookies     |
| `./downloads`    | `/app/downloads`   | Saved media files                |
| `./logs`         | `/app/logs`        | App logs                         |

If you hit permission issues: `sudo chown -R 1000:1000 ./data ./downloads ./logs`

### 🛠 Useful commands

```bash
docker compose up -d                              # start in background
docker compose logs -f ytdlp-api                  # tail app logs
docker compose logs -f bgutil-provider            # tail provider logs
docker compose ps                                 # status + healthcheck
docker compose exec ytdlp-api sh                  # shell into the container
docker compose restart                            # restart both services
docker compose down                               # stop & remove
docker compose pull && docker compose up -d --build   # update
```

### 🩺 Verify it works

```bash
curl http://localhost:3000/health
# → {"status":"ok","uptime":12.3,"timestamp":...,"ffmpeg":true}

curl "http://localhost:3000/api/info?url=https://youtu.be/dQw4w9WgXcQ" | jq .data.title
```

### 🐋 Build & run standalone (without compose)

```bash
# Build
docker build -t dl-api:nightly --build-arg YTDLP_CHANNEL=nightly .

# Run PO Token provider sidecar
docker run -d --name bgutil --restart unless-stopped \
  brainicism/bgutil-ytdlp-pot-provider:latest

# Run the API, linked to the provider
docker run -d \
  --name dl-api \
  -p 3000:3000 \
  --link bgutil \
  -e POTOKEN_PROVIDER_URL=http://bgutil:4416 \
  -e POTOKEN_PROVIDER_AUTO_START=false \
  -v "$PWD/data:/app/data" \
  -v "$PWD/downloads:/app/downloads" \
  -v "$PWD/logs:/app/logs" \
  --restart unless-stopped \
  dl-api:nightly
```

---

## ⚙️ Configuration

All settings via `.env` (see `.env.example`):

```env
PORT=3000
NODE_ENV=production

YT_DLP_PATH=yt-dlp
FFMPEG_PATH=                              # blank = auto-detect

POTOKEN_PROVIDER_URL=http://127.0.0.1:4416
POTOKEN_PROVIDER_AUTO_START=true

DATA_DIR=./data
COOKIES_FILE=./data/cookies.txt
DOWNLOAD_DIR=./downloads

MAX_DOWNLOAD_DURATION_SEC=21600           # 6 hours
DOWNLOAD_TIMEOUT_MS=1800000               # 30 min

DEFAULT_VIDEO_HEIGHT=720                  # default max height (720, 1080, 2160)
DEFAULT_AUDIO_LANG=bn                     # default audio lang (bn, en, hi, etc.)

EMBED_METADATA=true                       # auto-embed thumbnail + tags + credit
QUEUE_MAX_CONCURRENCY=3                   # max parallel queue downloads
QUEUE_RATE_LIMIT_PER_MIN=30               # per-IP batch rate limit
QUEUE_MAX_BATCH_SIZE=20                   # max URLs per batch request
```

---

## 📚 API Endpoints

### 🌐 Public Endpoints

| Method | Endpoint                          | Description                                         |
| ------ | --------------------------------- | --------------------------------------------------- |
| `GET`  | `/api/info?url=...`               | Full video metadata (title, formats, embed, etc.)   |
| `GET`  | `/api/embed?url=...`              | OEmbed-style embed object                           |
| `GET`  | `/api/formats?url=...`            | All available formats grouped by media type + summary |
| `GET`  | `/api/dump?url=...`               | Full raw `yt-dlp --dump-json` (every field)         |
| `GET`  | `/api/search?q=...&limit=10`      | YouTube search (1–50 results)                       |
| `GET`  | `/api/playlist?url=...`           | Flat playlist listing                               |
| `GET`  | `/api/thumbnail?url=...&quality=` | Best/high/medium/default thumbnail                  |
| `GET`  | `/api/subtitles?url=...&lang=en`  | Available subtitles for a language                  |
| `GET`  | `/api/download?url=...`           | **Stream** download (video/audio)                   |
| `GET`  | `/api/download/save?url=...`      | **Save** to disk, returns local URL                 |
| `GET`  | `/api/presets`                    | List all 36+ audio/video presets                    |
| `GET`  | `/api/download/quality?...`       | Custom-bitrate audio (e.g. `48k`, `192k`, `flac`)   |
| `GET`  | `/api/download/resolution?...`    | Custom-resolution video (e.g. `480p`, `gif`)        |
| `POST` | `/api/convert?filename=...`       | Convert an already-downloaded file                  |
| `POST` | `/api/transcode`                  | Fully custom transcode (codec, CRF, crop, etc.)     |
| `GET`  | `/api/probe?filename=...`         | FFprobe metadata of a stored file                   |
| `GET`  | `/api/status`                     | Server status + ffmpeg/potoken health               |

### 🔐 Admin Endpoints

| Method | Endpoint                        | Description                                  |
| ------ | ------------------------------- | -------------------------------------------- |
| `POST` | `/api/admin/potoken`            | Push new PO Token (GitHub Action / manual)   |
| `POST` | `/api/admin/cookies`            | Upload Netscape **or** JSON cookies          |
| `GET`  | `/api/admin/status`             | Detailed admin status                        |
| `POST` | `/api/admin/restart-provider`   | Restart the PO Token provider process        |

### 🩺 System Endpoints

| Method | Endpoint    | Description                          |
| ------ | ----------- | ------------------------------------ |
| `GET`  | `/`         | Discovery: lists all endpoints       |
| `GET`  | `/health`   | Uptime + ffmpeg readiness            |
| `GET`  | `/downloads/<file>` | Static serving of downloaded files |

---

## 🎨 Quality Presets

### 🎵 Audio Presets (19 total)

| Preset       | Codec        | Bitrate | Sample Rate | Channels | Format |
| ------------ | ------------ | ------- | ----------- | -------- | ------ |
| `8k`–`48k`   | libmp3lame   | 8k–48k  | 22050/44100 | mono     | mp3    |
| `64k`–`320k` | libmp3lame   | 64k–320k| 44100/48000 | stereo   | mp3    |
| `opus-low/medium/high` | libopus | 32k/96k/192k | 48000 | stereo | opus |
| `aac-low/high` | aac        | 96k/256k | 44100/48000 | stereo | m4a   |
| `flac`       | flac         | lossless| 48000       | stereo   | flac   |
| `wav`        | pcm_s16le    | lossless| 48000       | stereo   | wav    |

### 🎬 Video Presets (17 total)

| Preset       | Resolution  | Bitrate | Codec       | Format |
| ------------ | ----------- | ------- | ----------- | ------ |
| `144p`–`1080p` | 256×144 – 1920×1080 | 100k–5M | libx264 | mp4 |
| `1440p`      | 2560×1440   | 10M     | libx264     | mp4    |
| `2160p`      | 3840×2160   | 20M     | libx265     | mp4    |
| `160x120` / `320x240` / `640x480` | Classic VGA | — | libx264 | mp4 |
| `crf-18/23/28` | quality-based | — | libx264   | mp4    |
| `gif`        | 480×auto    | —       | gif         | gif    |
| `webm-720p/1080p` | 1280×720 / 1920×1080 | 2M / 4M | libvpx-vp9 + opus | webm |

> 💡 List dynamically: `curl http://localhost:3000/api/presets`

---

## 💡 Usage Examples

### Stream a YouTube video (auto-best)

```bash
curl -o video.mp4 "http://localhost:3000/api/download?url=https://youtu.be/dQw4w9WgXcQ"
```

### Format selector — height + language

```bash
# 720p video with Bengali audio (default)
curl -o video.mp4 "http://localhost:3000/api/download?url=https://youtu.be/dQw4w9WgXcQ"

# 480p video with English audio
curl -o video.mp4 "http://localhost:3000/api/download?url=https://youtu.be/dQw4w9WgXcQ&height=480&lang=en"

# 1080p with any audio (no language filter)
curl -o video.mp4 "http://localhost:3000/api/download?url=https://youtu.be/dQw4w9WgXcQ&height=1080"

# Custom yt-dlp format string (advanced)
curl -o video.mp4 "http://localhost:3000/api/download?url=https://youtu.be/dQw4w9WgXcQ&format=bestvideo[height<=720]+bestaudio[language=bn]/best"
```

Default format: `bestvideo[height<=720]+bestaudio[language=bn]/best` (configurable via `DEFAULT_VIDEO_HEIGHT` and `DEFAULT_AUDIO_LANG` in `.env`)

### Extract 48 kbps mono mp3

```bash
curl -o audio.mp3 "http://localhost:3000/api/download/quality?url=https://youtu.be/dQw4w9WgXcQ&quality=48k"
```

### Transcode to 480p

```bash
# Default (mode=auto): if a 480p source format exists, smart-merge with audio
# (no ffmpeg re-encode). Falls back to ffmpeg transcode otherwise.
curl -o video.mp4 "http://localhost:3000/api/download/resolution?url=https://youtu.be/dQw4w9WgXcQ&resolution=480p"

# Force a re-encode even if 480p is available
curl -o video.mp4 "http://localhost:3000/api/download/resolution?url=...&resolution=480p&mode=transcode"

# Force smart-merge; 422 if no source format at the target height
curl -o video.mp4 "http://localhost:3000/api/download/resolution?url=...&resolution=480p&mode=merge"
```

The response includes two headers that tell you which path was taken:
- `X-Merge-Mode`: `smart-merge` or `transcode`
- `X-Source-Format`: the source `format_id` and codec (e.g. `137 (1920x1080 avc1.640028)`)

### Convert an existing file (POST)

```bash
curl -X POST "http://localhost:3000/api/convert?filename=abc.mp4&format=mp3&bitrate=192k"
```

### Custom transcode (POST JSON)

```bash
curl -X POST http://localhost:3000/api/transcode \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "input.mp4",
    "videoCodec": "libx265",
    "crf": 24,
    "width": 1280,
    "height": 720,
    "fps": 30,
    "audioCodec": "aac",
    "audioBitrate": "128k",
    "startTime": "00:00:10",
    "endTime": "00:00:40"
  }'
```

### Get video metadata

```bash
curl "http://localhost:3000/api/info?url=https://youtu.be/dQw4w9WgXcQ" | jq
```

### List all available formats (curated, grouped)

```bash
# Returns { video_only, audio_only, combined } arrays + a summary with the
# best of each kind. Each format includes width/height/fps/codecs/bitrate/
# protocol/filesize/dynamic_range/audio_channels/language/...
curl "http://localhost:3000/api/formats?url=https://youtu.be/dQw4w9WgXcQ" | jq

# Pull just the best video (highest resolution) and best audio from the
# curated summary:
curl "http://localhost:3000/api/formats?url=https://youtu.be/dQw4w9WgXcQ" \
  | jq '.data.summary | {best_video, best_audio}'
```

### Get the full raw `dump.json` (every field yt-dlp emits)

```bash
# Heavy response — includes http_headers, downloader_options,
# fragment_base_url, full thumbnails array, etc.
curl "http://localhost:3000/api/dump?url=https://youtu.be/dQw4w9WgXcQ" | jq

# Show only the format list from the raw dump:
curl "http://localhost:3000/api/dump?url=https://youtu.be/dQw4w9WgXcQ" | jq '.data.formats | length'
```

### Search YouTube

```bash
curl "http://localhost:3000/api/search?q=lofi+beats&limit=5"
```

### Batch download (multiple URLs)

```bash
# Submit a batch of URLs for download
curl -X POST http://localhost:3000/api/batch \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://youtu.be/9bZkp7q19f0"
    ],
    "height": 720,
    "lang": "bn",
    "priority": "normal"
  }'

# Check batch status
curl "http://localhost:3000/api/batch/<batch-id>"
```

### Queue status

```bash
# View queue stats
curl "http://localhost:3000/api/queue/status"

# List all jobs
curl "http://localhost:3000/api/queue"
```

---

## 🏷️ Auto-Embedded Metadata & Cover Art

Every download (audio **and** video) is automatically tagged with the full
yt-dlp metadata using `ffmpeg -c copy` — **no re-encoding**, the operation
is lossless and adds only ~1–3 seconds.

| Container | What gets embedded |
|---|---|
| **MP4 / M4A / MOV** | `title`, `artist`, `album`, `album_artist`, `composer`, `date`, `year`, `description`, `comment`, `synopsis`, `lyrics`, `genre`, `keywords`, `show`, `performer`, `copyright`, `publisher`, `encoded_by`, `tool`, `software`, `author`, `language`, `network=YouTube`, `source`, plus the **thumbnail as cover art** (`disposition:attached_pic`) |
| **MP3** | Same fields, written as ID3v2.3 + ID3v1 (max compatibility) |
| **WebM / MKV** | Same fields where supported; cover art attached when the container allows |
| **Opus / FLAC / WAV** | Same fields via Vorbis comments / RIFF INFO |

**Developer Credit** is embedded in five places so it shows up in any tag viewer:

- `encoded_by` = `Mohammad Kobir Shah <https://github.com/MohammadKobirShah>`
- `publisher` = `YT-DLP API Server by Mohammad Kobir Shah`
- `author`    = `Mohammad Kobir Shah`
- `comment`   = `Downloaded via YT-DLP API Server v2.2.0 — by Mohammad Kobir Shah (https://github.com/MohammadKobirShah)`
- `software`  = `YT-DLP API Server v2.2.0 — crafted by Mohammad Kobir Shah`

### Disable per-request or globally

```bash
# Skip embedding for one download
curl ".../api/download?url=...&embed=false"

# Disable for everyone (env var, .env, or Railway Variables)
EMBED_METADATA=false
```

The thumbnail is fetched from YouTube's own CDN (maxresdefault.jpg when
available) and embedded as `disposition:attached_pic` so it shows up as
cover art in music players (mp3/m4a) and as cover/poster for video
players that support it.

---

## 🍪 Cookies & PO Token

### Upload cookies (Netscape format)

```bash
curl -X POST http://localhost:3000/api/admin/cookies \
  -H "Content-Type: text/plain" \
  --data-binary @cookies.txt
```

### Upload cookies (JSON export from browser extension)

```bash
curl -X POST http://localhost:3000/api/admin/cookies \
  -H "Content-Type: application/json" \
  -d @cookies.json
```

### Manually push a PO Token

```bash
curl -X POST http://localhost:3000/api/admin/potoken \
  -H "Content-Type: application/json" \
  -d '{
    "potoken": "YOUR_TOKEN",
    "visitorData": "YOUR_VISITOR_DATA",
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

### 🔁 Auto-refresh via GitHub Actions

A workflow at `.github/workflows/potoken-update.yml` runs **every 6 hours**, generates a fresh PO Token, and pushes it to your server via the admin endpoint.

**Setup:**
1. Go to **Repo → Settings → Secrets → Actions**
2. Add secret: `API_URL = https://your-server.com`
3. Done — the workflow auto-runs on schedule + manual dispatch.

---

## 🚢 Deployment

### 🟢 PM2 (Recommended for VPS)

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup           # generate boot script
pm2 logs ytdlp-api    # tail logs
pm2 restart ytdlp-api
```

### 🐧 Systemd

```ini
# /etc/systemd/system/ytdlp-api.service
[Unit]
Description=YT-DLP API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/DL-API
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now ytdlp-api
sudo journalctl -u ytdlp-api -f
```

### 🌐 Nginx reverse proxy

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;        # crucial for streaming downloads
        proxy_read_timeout 1800s;
    }
}
```

---

## 🛠 Architecture

```
                       ┌──────────────────────────┐
   GitHub Action ──6h──▶│  /api/admin/potoken     │
                       └──────────────────────────┘
                                  │
   Client ───HTTP───▶  ┌──────────▼─────────┐
                       │   Express Server    │
                       │  (server.js)        │
                       └─┬───────┬─────────┬─┘
                         │       │         │
              ┌──────────▼┐  ┌───▼────┐ ┌──▼─────────┐
              │ ytdlp     │  │ ffmpeg │ │ potoken    │
              │ Service   │  │ Service│ │ Service    │
              └──────┬────┘  └───┬────┘ └────┬───────┘
                     │           │           │
                  ┌──▼──┐    ┌───▼───┐  ┌────▼─────────┐
                  │yt-dlp│   │ffmpeg │  │ bgutil-pot   │
                  │binary│   │binary │  │ provider     │
                  └──────┘   └───────┘  └──────────────┘
```

---

## 📂 Project Structure

```
DL-API/
├── server.js                       # Main entry point
├── ecosystem.config.cjs            # PM2 config
├── Dockerfile                      # Multi-arch Debian-based image
├── docker-compose.yml              # One-shot deployment
├── .dockerignore
├── package.json
├── .env.example
│
├── config/
│   └── index.js                    # Centralized config
│
├── utils/
│   └── logger.js                   # Colored stdout logger
│
├── services/
│   ├── ytdlpService.js             # Core yt-dlp engine
│   ├── ffmpegService.js            # FFmpeg control + probe
│   ├── ffmpegPresets.js            # 36+ quality presets
│   ├── potokenService.js           # PO Token + provider mgmt
│   └── storageService.js           # Token/cookie persistence
│
├── routes/
│   ├── public.js                   # 15 public endpoints
│   └── admin.js                    # 4 admin endpoints
│
├── scripts/
│   └── get_potoken.js              # GitHub Action helper
│
├── .github/workflows/
│   └── potoken-update.yml          # Auto-refresh PO Token
│
├── data/                           # (auto-created)
│   ├── potoken.json
│   ├── visitor_data.json
│   └── cookies.txt
│
└── downloads/                      # (auto-created)
```

---

## 🤝 Contributing

Contributions are welcome! Here's the flow:

1. 🍴 Fork the repo
2. 🌱 Create a feature branch (`git checkout -b feat/amazing-feature`)
3. ✅ Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. 📤 Push to your fork (`git push origin feat/amazing-feature`)
5. 🔁 Open a Pull Request

For bugs or feature requests, please [open an issue](https://github.com/MohammadKobirShah/DL-API/issues).

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

<div align="center">

## 👨‍💻 Developer

### **Mohammad Kobir Shah**

> *Building robust, production-grade backends and developer tools.*

[![GitHub](https://img.shields.io/badge/GitHub-MohammadKobirShah-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/MohammadKobirShah)
[![Repo](https://img.shields.io/badge/Repository-DL--API-blue?style=for-the-badge&logo=git&logoColor=white)](https://github.com/MohammadKobirShah/DL-API)

---

### 🌟 Show your support

If this project helped you, please consider giving it a ⭐ on [GitHub](https://github.com/MohammadKobirShah/DL-API)!

<br/>

**Crafted with ❤️ by [Mohammad Kobir Shah](https://github.com/MohammadKobirShah)**

<sub>© 2026 Mohammad Kobir Shah · All rights reserved · YT-DLP API Server v2.2.0</sub>

</div>
