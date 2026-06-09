const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('fs');
const config = require('./config');
const logger = require('./utils/logger');
const potoken = require('./services/potokenService');
const storage = require('./services/storageService');
const ffmpeg = require('./services/ffmpegService');
const queue = require('./services/queueService');
const ytdlp = require('./services/ytdlpService');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
}));

if (!fs.existsSync(config.downloadDir)) fs.mkdirSync(config.downloadDir, { recursive: true });
if (!fs.existsSync(config.dataDir)) fs.mkdirSync(config.dataDir, { recursive: true });

app.use('/downloads', express.static(config.downloadDir));

app.use('/api', require('./routes/public'));
app.use('/api/admin', require('./routes/admin'));

app.get('/', (req, res) => {
  res.json({
    name: 'YT-DLP API Server',
    version: '2.2.0',
    endpoints: {
      public: [
        'GET  /api/info?url=...',
        'GET  /api/embed?url=...',
        'GET  /api/formats?url=...',
        'GET  /api/dump?url=...',
        'GET  /api/search?q=...&limit=10',
        'GET  /api/playlist?url=...',
        'GET  /api/thumbnail?url=...&quality=maxres',
        'GET  /api/subtitles?url=...&lang=en',
        'GET  /api/download?url=...&type=video|audio&format=best',
        'GET  /api/download/save?url=...',
        'GET  /api/presets',
        'GET  /api/download/quality?url=...&quality=48k',
        'GET  /api/download/resolution?url=...&resolution=480p',
        'POST /api/convert?filename=...&format=mp3',
        'POST /api/transcode',
        'GET  /api/probe?filename=...',
        'GET  /api/status',
        'GET  /api/queue/status',
        'GET  /api/queue',
        'POST /api/batch',
        'GET  /api/batch/:id',
      ],
      admin: [
        'POST /api/admin/potoken',
        'POST /api/admin/cookies',
        'GET  /api/admin/status',
        'POST /api/admin/restart-provider',
      ],
    },
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: Date.now(),
    ffmpeg: ffmpeg.isAvailable(),
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

app.use((err, req, res, next) => {
  logger.error(err.stack || err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

async function bootstrap() {
  logger.info('Detecting ffmpeg...');
  await ffmpeg.detect();
  if (!ffmpeg.isAvailable()) {
    logger.warn('⚠️  FFmpeg not found. Audio extraction and video merging will be limited.');
  } else {
    logger.success(`✓ FFmpeg ready: ${ffmpeg.getPath()} (${ffmpeg.version})`);
  }

  await potoken.startProvider();

  queue.setProcessor(async (job) => {
    logger.info(`[Queue] Processing job ${job.id}: ${job.url}`);
    const result = await ytdlp.downloadToDisk(job.url, {
      type: job.type,
      format: job.format,
      audioFormat: job.audioFormat,
      audioBitrate: job.quality || '192k',
      title: null,
      embed: false,
    });
    return result;
  });

  app.listen(config.port, () => {
    logger.success(`🚀 YT-DLP API Server running on http://0.0.0.0:${config.port}`);
    logger.info(`📁 Data dir: ${config.dataDir}`);
    logger.info(`📥 Downloads: ${config.downloadDir}`);
    logger.info(`🍪 Cookies: ${storage.hasCookies() ? '✓ Loaded' : '✗ Not loaded'}`);
  });
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed:', err);
  process.exit(1);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down...`);
  potoken.shutdown();
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
