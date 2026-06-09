require('dotenv').config();
const path = require('path');

const parseBool = (val, def = false) => {
  if (val === undefined || val === null || val === '') return def;
  return String(val).toLowerCase() === 'true';
};

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || 'development',
  ytdlpPath: process.env.YT_DLP_PATH || 'yt-dlp',
  ffmpegPath: process.env.FFMPEG_PATH || '',
  potoken: {
    providerUrl: process.env.POTOKEN_PROVIDER_URL || 'http://127.0.0.1:4416',
    autoStart: parseBool(process.env.POTOKEN_PROVIDER_AUTO_START, true),
  },
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  cookiesFile: path.resolve(process.env.COOKIES_FILE || './data/cookies.txt'),
  downloadDir: path.resolve(process.env.DOWNLOAD_DIR || './downloads'),
  download: {
    maxDuration: parseInt(process.env.MAX_DOWNLOAD_DURATION_SEC || '21600', 10),
    timeoutMs: parseInt(process.env.DOWNLOAD_TIMEOUT_MS || '1800000', 10),
    defaultHeight: parseInt(process.env.DEFAULT_VIDEO_HEIGHT || '720', 10),
    defaultLang: process.env.DEFAULT_AUDIO_LANG || 'bn',
  },
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  queue: {
    maxConcurrency: parseInt(process.env.QUEUE_MAX_CONCURRENCY || '3', 10),
    rateLimitPerMin: parseInt(process.env.QUEUE_RATE_LIMIT_PER_MIN || '30', 10),
    maxBatchSize: parseInt(process.env.QUEUE_MAX_BATCH_SIZE || '20', 10),
  },
};
