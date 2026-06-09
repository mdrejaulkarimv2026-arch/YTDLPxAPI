const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');
const potoken = require('./potokenService');
const storage = require('./storageService');
const ffmpeg = require('./ffmpegService');
const metadataSvc = require('./metadataService');

function validateUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const host = parsed.hostname.toLowerCase();
    if (['169.254.169.254','metadata.google.internal','localhost','127.0.0.1'].includes(host) || host.startsWith('::1')) {
      return false;
    }
    return true;
  } catch { return false; }
}

class YtdlpService {
  constructor() {
    if (!fs.existsSync(config.downloadDir)) {
      fs.mkdirSync(config.downloadDir, { recursive: true });
    }
  }

  buildBaseArgs() {
    const args = potoken.getYtdlpArgs();
    if (ffmpeg.isAvailable()) {
      args.push('--ffmpeg-location', ffmpeg.getPath());
    }
    return args;
  }

  async getInfo(url, options = {}) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    return new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(),
        '--dump-json', '--no-warnings', '--no-playlist', '--skip-download',
      ];
      if (options.flatPlaylist) args.push('--flat-playlist');
      args.push(url);
      this.exec(args).then((stdout) => {
        try {
          const info = JSON.parse(stdout);
          resolve(this.formatInfo(info));
        } catch (e) { reject(new Error('Failed to parse yt-dlp output')); }
      }).catch(reject);
    });
  }

  async getFormats(url) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    return new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(), '--dump-json', '--no-warnings', '--skip-download', url,
      ];
      this.exec(args).then((stdout) => {
        try {
          const info = JSON.parse(stdout);
          const all = (info.formats || []).map((f) => this.normalizeFormat(f));

          const isVideoOnly = (f) => f.vcodec && f.vcodec !== 'none' && (!f.acodec || f.acodec === 'none');
          const isAudioOnly = (f) => f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none');
          const isCombined  = (f) => f.vcodec && f.vcodec !== 'none' && f.acodec && f.acodec !== 'none';

          const videoOnly = all.filter(isVideoOnly);
          const audioOnly = all.filter(isAudioOnly);
          const combined  = all.filter(isCombined);

          const byHeightDesc = (a, b) => (b.height || 0) - (a.height || 0) || (b.tbr || 0) - (a.tbr || 0);
          const byTbrDesc     = (a, b) => (b.tbr || b.abr || 0) - (a.tbr || a.abr || 0);
          const byScoreDesc   = (a, b) => (b.score || 0) - (a.score || 0);

          const bestVideo   = [...videoOnly].sort(byHeightDesc)[0] || null;
          const bestAudio   = [...audioOnly].sort(byTbrDesc)[0] || null;
          const bestCombined = [...combined].sort(byScoreDesc)[0] || null;

          resolve({
            url: info.webpage_url || url,
            extractor: info.extractor,
            extractor_key: info.extractor_key,
            id: info.id,
            title: info.title,
            duration: info.duration,
            duration_string: info.duration_string,
            summary: {
              total_formats: all.length,
              video_only: videoOnly.length,
              audio_only: audioOnly.length,
              combined: combined.length,
              best_video: bestVideo,
              best_audio: bestAudio,
              best_combined: bestCombined,
            },
            video_only: videoOnly,
            audio_only: audioOnly,
            combined,
          });
        } catch (e) { reject(new Error('Failed to parse formats')); }
      }).catch(reject);
    });
  }

  async getRawDump(url) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    return new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(), '--dump-json', '--no-warnings', '--skip-download',
        '--no-playlist', url,
      ];
      this.exec(args).then((stdout) => {
        try {
          resolve(JSON.parse(stdout));
        } catch (e) { reject(new Error('Failed to parse yt-dlp dump-json output')); }
      }).catch(reject);
    });
  }

  async findBestVideoAtHeight(url, targetHeight, outputContainer = 'mp4') {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    const data = await this.getFormats(url);
    const pool = [...(data.video_only || []), ...(data.combined || [])];
    const matches = pool.filter((f) => f.height === targetHeight);
    if (matches.length === 0) return null;

    const isAvc = (vc) => vc && vc.startsWith('avc1');
    const isVp9 = (vc) => vc && (vc.startsWith('vp9') || vc.startsWith('vp09'));
    const isHevc = (vc) => vc && (vc.startsWith('hev1') || vc.startsWith('hvc1'));
    const isAv1  = (vc) => vc && (vc.startsWith('av01'));

    const score = (f) => {
      const mp4  = f.ext === 'mp4';
      const webm = f.ext === 'webm';
      if (outputContainer === 'mp4') {
        if (mp4  && isAvc(f.vcodec))  return 100;
        if (mp4  && isHevc(f.vcodec)) return 90;
        if (mp4)                       return 80;
        if (webm && isVp9(f.vcodec))   return 60;
        if (webm && isAv1(f.vcodec))   return 50;
        return 10;
      }
      if (outputContainer === 'webm') {
        if (webm && isVp9(f.vcodec))  return 100;
        if (webm && isAv1(f.vcodec))  return 90;
        if (webm)                      return 80;
        if (mp4  && isAvc(f.vcodec))  return 60;
        if (mp4  && isVp9(f.vcodec))  return 50;
        return 10;
      }
      return 10;
    };

    matches.sort((a, b) => score(b) - score(a));
    return matches[0];
  }

  async getTitle(url) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    return new Promise((resolve) => {
      const args = [
        ...this.buildBaseArgs(),
        '--no-warnings', '--no-playlist', '--skip-download',
        '--print', '%(title)s', url,
      ];
      this.exec(args).then((stdout) => {
        const title = (stdout || '').trim().split('\n')[0];
        resolve(title || 'video');
      }).catch((err) => {
        logger.warn(`[getTitle] probe failed, using fallback: ${err.message}`);
        resolve('video');
      });
    });
  }

  normalizeFormat(f) {
    const isVideo = f.vcodec && f.vcodec !== 'none';
    const isAudio = f.acodec && f.acodec !== 'none';
    const filesize = f.filesize || f.filesize_approx || null;

    const score =
      (isVideo ? (f.height || 0) * (f.fps || 0) : 0) +
      (isAudio ? (f.abr || f.tbr || 0) * 2 : 0);

    return {
      format_id: f.format_id,
      format_note: f.format_note || null,
      ext: f.ext,
      container: f.container || null,
      protocol: f.protocol || null,
      resolution: f.resolution || null,
      width: f.width || null,
      height: f.height || null,
      aspect_ratio: f.aspect_ratio || null,
      fps: f.fps || null,
      vcodec: f.vcodec || null,
      acodec: f.acodec || null,
      audio_channels: f.audio_channels || null,
      audio_sample_rate: f.audio_sample_rate || f.asr || null,
      tbr: f.tbr || null,
      vbr: f.vbr || null,
      abr: f.abr || null,
      filesize,
      filesize_human: filesize ? this.humanSize(filesize) : null,
      dynamic_range: f.dynamic_range || null,
      has_drm: !!f.has_drm,
      language: f.language || null,
      preference: f.preference ?? null,
      quality: f.quality ?? null,
      format: f.format || null,
      manifest_url: f.manifest_url || null,
      media_type: isVideo && isAudio ? 'combined' : isVideo ? 'video_only' : isAudio ? 'audio_only' : 'unknown',
      score,
    };
  }

  humanSize(bytes) {
    if (!bytes || bytes <= 0) return null;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let n = bytes;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(n >= 100 || i === 0 ? 0 : n >= 10 ? 1 : 2)} ${units[i]}`;
  }

  async search(query, limit = 10) {
    return new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(), '--dump-json', '--no-warnings',
        '--flat-playlist', '--skip-download', `ytsearch${limit}:${query}`,
      ];
      this.exec(args).then((stdout) => {
        try {
          const lines = stdout.trim().split('\n').filter(Boolean);
          const results = lines.map((line) => JSON.parse(line)).map((info) => ({
            id: info.id, title: info.title, url: info.url || info.webpage_url,
            duration: info.duration, uploader: info.uploader || info.channel,
            thumbnail: info.thumbnails?.[0]?.url || info.thumbnail, view_count: info.view_count,
          }));
          resolve(results);
        } catch (e) { reject(e); }
      }).catch(reject);
    });
  }

  async getPlaylist(url) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    return new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(), '--dump-json', '--no-warnings',
        '--flat-playlist', '--skip-download', url,
      ];
      this.exec(args).then((stdout) => {
        try {
          const lines = stdout.trim().split('\n').filter(Boolean);
          const items = lines.map((line) => JSON.parse(line));
          resolve({
            count: items.length,
            items: items.map((info) => ({
              id: info.id, title: info.title, url: info.url || info.webpage_url,
              duration: info.duration, uploader: info.uploader,
            })),
          });
        } catch (e) { reject(e); }
      }).catch(reject);
    });
  }

  async getSubtitles(url, lang = 'en') {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    return new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(), '--dump-json', '--no-warnings', '--skip-download',
        '--write-subs', '--write-auto-subs', '--sub-langs', lang, url,
      ];
      this.exec(args).then((stdout) => {
        try {
          const info = JSON.parse(stdout);
          resolve(info.subtitles || {});
        } catch (e) { reject(e); }
      }).catch(reject);
    });
  }

  async streamDownload(url, res, options = {}) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    const { format, type = 'video', audioFormat = 'mp3' } = options;

    if (type === 'audio' && !ffmpeg.isAvailable()) {
      throw new Error('Audio extraction requires ffmpeg, but it was not found.');
    }

    const args = [...this.buildBaseArgs(), '--no-warnings', '--no-playlist'];

    if (type === 'audio') {
      args.push('-x', '--audio-format', audioFormat, '-o', '-');
    } else {
      if (format && format !== 'best') {
        args.push('-f', format);
        if (format.includes('+') && ffmpeg.isAvailable()) {
          args.push('--merge-output-format', 'mp4');
        }
      } else {
        if (!ffmpeg.isAvailable()) {
          logger.warn('FFmpeg missing — falling back to single-file best format');
          args.push('-f', 'best');
        } else {
          args.push('-f', 'bestvideo+bestaudio/best');
          args.push('--merge-output-format', 'mp4');
        }
      }
      args.push('-o', '-');
    }
    args.push(url);

    logger.info(`Streaming: yt-dlp <args redacted>, type=${type}`);

    const child = spawn(config.ytdlpPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });

    let stderr = '';
    let killed = false;
    const cleanup = () => {
      if (!killed && !child.killed) {
        killed = true;
        try { child.kill('SIGTERM'); } catch {}
      }
    };

    res.on('close', cleanup);
    res.on('error', cleanup);

    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.stdout.on('error', (err) => {
      logger.error('Stream error:', err.message);
      if (!res.headersSent) {
        try { res.status(500).json({ success: false, error: err.message }); } catch {}
      }
      cleanup();
    });

    child.on('error', (err) => {
      logger.error('yt-dlp spawn error:', err.message);
      if (!res.headersSent) {
        try { res.status(500).json({ success: false, error: err.message }); } catch {}
      }
      cleanup();
    });

    child.on('close', (code) => {
      if (code !== 0 && !res.headersSent) {
        const truncated = stderr.length > 500 ? stderr.slice(-500) : stderr;
        if (/ffmpeg|merge|post-?process/i.test(stderr)) {
          logger.error(`yt-dlp failed (likely ffmpeg issue): ${truncated}`);
          try {
            res.status(500).json({
              success: false,
              error: 'Media processing failed. FFmpeg may be missing.',
              details: truncated,
            });
          } catch {}
        } else {
          logger.error(`yt-dlp exited with code ${code}: ${truncated}`);
          try {
            res.status(500).json({ success: false, error: 'Download failed', details: truncated });
          } catch {}
        }
      }
    });

    child.stdout.pipe(res);
  }

  async downloadToDisk(url, options = {}) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    const {
      type = 'video', format, audioFormat = 'mp3', audioBitrate = '192k',
      title = null, embed = metadataSvc.EMBED_ENABLED,
    } = options;
    const { path: tmpPath, info } = await this._downloadToTempFile(url, { type, format, audioFormat, audioBitrate, probeInfo: !!title || embed });

    if (embed && ffmpeg.isAvailable()) {
      await metadataSvc.embedMetadataInPlace(tmpPath, info || {}).catch(() => {});
    }

    const finalExt = path.extname(tmpPath).slice(1);
    const finalName = (() => {
      if (!title) return path.basename(tmpPath);
      const sanitized = require('../utils/filename').safeFilename(title, finalExt);
      const newPath = path.join(config.downloadDir, sanitized);
      try {
        if (!fs.existsSync(newPath) && tmpPath !== newPath) {
          fs.renameSync(tmpPath, newPath);
          return sanitized;
        }
      } catch (e) {
        logger.warn(`[downloadToDisk] rename failed, keeping UUID name: ${e.message}`);
      }
      return path.basename(tmpPath);
    })();

    return {
      success: true,
      filename: finalName,
      url: `/downloads/${finalName}`,
      path: path.join(config.downloadDir, finalName),
      title: info?.title || title || 'video',
      embedded: embed,
    };
  }

  /**
   * Download a URL to a temp file in config.downloadDir and (optionally)
   * return the parsed yt-dlp info. Returns { path, info, ext }. The caller
   * is responsible for cleaning up the temp file or streaming it.
   */
  async _downloadToTempFile(url, options = {}) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    const { type = 'video', format, audioFormat = 'mp3', audioBitrate = '192k', probeInfo = false } = options;
    const id = uuidv4();
    const outputTemplate = path.join(config.downloadDir, `${id}.%(ext)s`);

    let info = null;
    if (probeInfo) {
      try { info = await this.getInfo(url); } catch (e) { logger.warn(`[download] info probe failed: ${e.message}`); }
    }

    const downloadedPath = await new Promise((resolve, reject) => {
      const args = [
        ...this.buildBaseArgs(), '-o', outputTemplate, '--no-warnings', '--no-playlist',
      ];
      if (type === 'audio') {
        if (!ffmpeg.isAvailable()) return reject(new Error('FFmpeg is required for audio extraction but was not found.'));
        args.push('-x', '--audio-format', audioFormat, '--audio-quality', audioBitrate);
      } else if (format && format !== 'best') {
        args.push('-f', format);
        if (format.includes('+') && ffmpeg.isAvailable()) {
          args.push('--merge-output-format', 'mp4');
        }
      } else {
        if (!ffmpeg.isAvailable()) {
          logger.warn('FFmpeg missing — using single-file best format');
          args.push('-f', 'best');
        } else {
          args.push('-f', 'bestvideo+bestaudio/best');
          args.push('--merge-output-format', 'mp4');
        }
      }
      args.push(url);

      const child = spawn(config.ytdlpPath, args, { windowsHide: true });
      let stderr = '';
      child.stderr.on('data', (data) => {
        const msg = data.toString();
        stderr += msg;
        const match = msg.match(/\[download\]\s+(\d+\.\d+)%/);
        if (match && options.onProgress) options.onProgress(parseFloat(match[1]));
      });
      child.on('close', (code) => {
        if (code === 0) {
          const allFiles = fs.readdirSync(config.downloadDir).filter((f) => f.startsWith(id));
          if (allFiles.length === 0) return reject(new Error('No output file found after download'));
          const merged = allFiles.find((f) => /\.(mp4|mkv|webm|m4a|mp3|opus|flac|wav)$/i.test(f));
          const final = merged || allFiles[0];
          for (const f of allFiles) {
            if (f !== final) try { fs.unlinkSync(path.join(config.downloadDir, f)); } catch {}
          }
          resolve(path.join(config.downloadDir, final));
        } else {
          const truncated = stderr.length > 500 ? stderr.slice(-500) : stderr;
          let errMsg = truncated || `yt-dlp exited with code ${code}`;
          if (/ffmpeg|merge|post-?process/i.test(stderr) && !ffmpeg.isAvailable()) {
            errMsg = `FFmpeg is required for this format but is not installed. ${errMsg}`;
          }
          reject(new Error(errMsg));
        }
      });
      child.on('error', reject);
    });

    return { path: downloadedPath, info, ext: path.extname(downloadedPath).slice(1) };
  }

  async streamWithEmbed(url, res, options = {}) {
    if (!validateUrl(url)) throw new Error('Invalid URL. Only http(s) URLs are allowed.');
    const { type = 'video', format, audioFormat = 'mp3', embed = metadataSvc.EMBED_ENABLED } = options;
    const { path: tmpPath, info, ext } = await this._downloadToTempFile(url, { type, format, audioFormat, probeInfo: embed });

    if (embed && ffmpeg.isAvailable() && info) {
      await metadataSvc.embedMetadataInPlace(tmpPath, info).catch(() => {});
    }

    const stats = fs.statSync(tmpPath);
    const mimeMap = {
      mp4: 'video/mp4', webm: 'video/webm', mkv: 'video/x-matroska',
      mp3: 'audio/mpeg', m4a: 'audio/mp4', opus: 'audio/opus',
      wav: 'audio/wav', flac: 'audio/flac',
    };
    const suggested = info?.title ? require('../utils/filename').safeFilename(info.title, ext) : `download-${uuidv4()}.${ext}`;
    res.setHeader('Content-Type', mimeMap[ext] || (type === 'audio' ? 'audio/mpeg' : 'video/mp4'));
    res.setHeader('Content-Disposition', `attachment; filename="${suggested}"; filename*=UTF-8''${encodeURIComponent(suggested)}`);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('X-Suggested-Filename', require('../utils/filename').headerSafe(suggested));
    res.setHeader('X-Title', require('../utils/filename').headerSafe(info?.title || ''));

    const cleanup = () => { try { fs.unlinkSync(tmpPath); } catch {} };
    res.on('close', cleanup);
    res.on('error', cleanup);
    const stream = fs.createReadStream(tmpPath);
    stream.pipe(res);
    stream.on('close', cleanup);
    stream.on('error', (err) => {
      logger.error('Stream error:', err.message);
      cleanup();
      if (!res.headersSent) try { res.status(500).json({ success: false, error: err.message }); } catch {}
    });
  }

  async convertFile(filename, options = {}) {
    if (!ffmpeg.isAvailable()) throw new Error('FFmpeg is not available for conversion.');
    const inputPath = path.join(config.downloadDir, filename);
    if (!fs.existsSync(inputPath)) throw new Error(`File not found: ${filename}`);

    const { outputFormat = 'mp3', codec, audioBitrate = '192k', videoCodec } = options;
    const baseName = path.parse(filename).name;
    const outputFilename = `${baseName}-converted-${Date.now()}.${outputFormat}`;
    const outputPath = path.join(config.downloadDir, outputFilename);

    const result = await ffmpeg.convert(inputPath, outputPath, { codec, audioBitrate, videoCodec });
    if (!result.success) throw new Error(`Conversion failed: ${result.error}`);

    return {
      success: true,
      filename: outputFilename,
      url: `/downloads/${outputFilename}`,
      path: outputPath,
      size: result.size,
    };
  }

  formatInfo(info) {
    const aspect = (info.width && info.height && info.height > 0)
      ? (info.width / info.height) : 16 / 9;
    const safeHeight = Math.round(640 / aspect) || 360;

    const sortedThumbs = (info.thumbnails || [])
      .filter((t) => t && t.width)
      .sort((a, b) => (b.width || 0) - (a.width || 0));
    const bestThumb = sortedThumbs[0];

    return {
      id: info.id, title: info.title, description: info.description,
      uploader: info.uploader || info.channel, uploader_id: info.uploader_id,
      uploader_url: info.uploader_url || info.channel_url,
      upload_date: info.upload_date, release_date: info.release_date, timestamp: info.timestamp,
      duration: info.duration, duration_string: info.duration_string,
      view_count: info.view_count, like_count: info.like_count,
      comment_count: info.comment_count, channel_follower_count: info.channel_follower_count,
      thumbnail: info.thumbnail, thumbnails: info.thumbnails,
      tags: info.tags || [], categories: info.categories || [],
      webpage_url: info.webpage_url, original_url: info.original_url,
      extractor: info.extractor, extractor_key: info.extractor_key,
      webpage_url_domain: info.webpage_url_domain,
      is_live: info.is_live, was_live: info.was_live,
      chapters: info.chapters || [],
      subtitles: info.subtitles ? Object.keys(info.subtitles) : [],
      automatic_captions: info.automatic_captions ? Object.keys(info.automatic_captions) : [],
      capabilities: {
        ffmpeg_available: ffmpeg.isAvailable(),
        ffmpeg_version: ffmpeg.version,
        supports_audio_extract: ffmpeg.isAvailable(),
        supports_merge: ffmpeg.isAvailable(),
      },
      embed: {
        type: 'video', version: '1.0', title: info.title,
        author_name: info.uploader || info.channel,
        author_url: info.uploader_url || info.channel_url,
        provider_name: info.extractor, provider_url: info.extractor_key,
        thumbnail_url: info.thumbnail,
        thumbnail_width: bestThumb?.width, thumbnail_height: bestThumb?.height,
        width: 640, height: safeHeight,
        html: `<iframe src="${info.embed_url || info.webpage_url}" width="640" height="${safeHeight}" frameborder="0" allowfullscreen></iframe>`,
        description: info.description?.substring(0, 200),
      },
      format_count: info.formats?.length || 0,
      formats: (info.formats || []).map((f) => ({
        format_id: f.format_id, ext: f.ext, resolution: f.resolution,
        fps: f.fps, vcodec: f.vcodec, acodec: f.acodec, filesize: f.filesize, tbr: f.tbr,
      })),
    };
  }

  exec(args, timeoutMs = null) {
    const timeout = timeoutMs || config.download.timeoutMs;
    return new Promise((resolve, reject) => {
      const child = spawn(config.ytdlpPath, args, { windowsHide: true });
      let stdout = '';
      let stderr = '';
      const timer = setTimeout(() => {
        try { child.kill('SIGTERM'); } catch {}
        reject(new Error(`yt-dlp timed out after ${timeout}ms`));
      }, timeout);
      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) resolve(stdout);
        else {
          const truncated = stderr.length > 500 ? stderr.slice(-500) : stderr;
          reject(new Error(truncated || `yt-dlp exited with code ${code}`));
        }
      });
      child.on('error', (err) => { clearTimeout(timer); reject(err); });
    });
  }
}

module.exports = new YtdlpService();
