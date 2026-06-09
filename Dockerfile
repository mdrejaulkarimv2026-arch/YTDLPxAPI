# syntax=docker/dockerfile:1.6
# ===================================================================
# DL-API — YT-DLP API Server
# Base: Debian 12 (Bookworm) Slim + Node.js 20 LTS
# Includes: ffmpeg, yt-dlp (NIGHTLY by default), bgutil-ytdlp-pot-provider, Deno
# ===================================================================

FROM node:20-bookworm-slim

LABEL org.opencontainers.image.title="DL-API" \
      org.opencontainers.image.description="24/7 YT-DLP API with PO Token bypass + FFmpeg transcoding" \
      org.opencontainers.image.authors="Mohammad Kobir Shah" \
      org.opencontainers.image.source="https://github.com/MohammadKobirShah/DL-API" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="2.2.0"

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=production \
    PORT=3000 \
    TZ=UTC \
    NPM_CONFIG_LOGLEVEL=warn \
    PATH="/usr/local/bin:/usr/local/sbin:${PATH}"

# -------------------------------------------------------------------
# System dependencies (ffmpeg, curl, tini, tzdata)
# -------------------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        ffmpeg \
        tini \
        tzdata \
        unzip \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/* \
 && ffmpeg -version | head -n1 \
 && ffprobe -version | head -n1

# -------------------------------------------------------------------
# Deno (alternative runtime)
# -------------------------------------------------------------------
RUN curl -fsSL https://deno.land/install.sh | sh \
 && ln -sf /root/.deno/bin/deno /usr/local/bin/deno \
 && deno --version

# -------------------------------------------------------------------
# yt-dlp — NIGHTLY by default (override with --build-arg YTDLP_CHANNEL=stable)
# Uses the self-contained PyInstaller binary (no Python on host needed)
# Multi-arch: amd64, arm64, armv7
# -------------------------------------------------------------------
ARG YTDLP_CHANNEL=nightly
RUN set -eux; \
    ARCH="$(dpkg --print-architecture)"; \
    case "$YTDLP_CHANNEL" in \
      nightly) REPO="yt-dlp/yt-dlp-nightly-builds" ;; \
      master)  REPO="yt-dlp/yt-dlp-master-builds"  ;; \
      stable)  REPO="yt-dlp/yt-dlp"                ;; \
      *) echo "Unknown YTDLP_CHANNEL: $YTDLP_CHANNEL"; exit 1 ;; \
    esac; \
    case "$ARCH" in \
      amd64) BIN="yt-dlp_linux"          ;; \
      arm64) BIN="yt-dlp_linux_aarch64"  ;; \
      armhf) BIN="yt-dlp_linux_armv7l"   ;; \
      *) echo "Unsupported arch: $ARCH"; exit 1 ;; \
    esac; \
    URL="https://github.com/${REPO}/releases/latest/download/${BIN}"; \
    echo "Downloading yt-dlp from: $URL"; \
    curl -fsSL "$URL" -o /usr/local/bin/yt-dlp; \
    chmod 0755 /usr/local/bin/yt-dlp; \
    /usr/local/bin/yt-dlp --version

# -------------------------------------------------------------------
# bgutil-ytdlp-pot-provider is run as a separate sidecar container
# (official image: brainicism/bgutil-ytdlp-pot-provider). The Node
# app talks to it via POTOKEN_PROVIDER_URL — no bake-in needed.
# -------------------------------------------------------------------

# -------------------------------------------------------------------
# Application setup
# -------------------------------------------------------------------
WORKDIR /app

# Cache Node deps layer: copy manifests first
COPY package*.json ./
RUN npm ci --omit=dev \
 && npm cache clean --force

# Copy the rest of the application source
COPY . .

# Create runtime directories with correct ownership for non-root user
RUN mkdir -p /app/data /app/downloads /app/logs \
 && chown -R node:node /app

USER node

EXPOSE 3000

# Note: Use platform-native volumes (Railway Volumes, K8s PVC, docker-compose
# bind mounts) for /app/data, /app/downloads, /app/logs persistence.

# -------------------------------------------------------------------
# Healthcheck (uses /health endpoint)
# -------------------------------------------------------------------
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

# -------------------------------------------------------------------
# tini handles PID 1 + signal forwarding (graceful SIGTERM)
# -------------------------------------------------------------------
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
