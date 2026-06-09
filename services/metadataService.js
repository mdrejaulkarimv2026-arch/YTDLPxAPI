/**
 * Lightweight metadata + thumbnail embedding service.
 *
 * Embeds only: thumbnail (cover art), title, artist, album, date.
 * Uses ffmpeg -c copy — no re-encoding, fast and lossless.
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

const EMBED_ENABLED = (process.env.EMBED_METADATA ?? 'true').toLowerCase() !== 'false';

function sanitize(s, maxLen = 500) {
  if (s === null || s === undefined) return null;
  s = String(s).replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.length > maxLen) s = s.substring(0, maxLen).trim();
  return s || null;
}

function buildLightMetadataArgs(info = {}) {
  const args = [];
  const set = (k, v) => { const c = sanitize(v); if (c) args.push('-metadata', `${k}=${c}`); };

  set('title', info.title);
  set('artist', info.uploader || info.channel);
  set('album', info.uploader || info.channel);

  if (info.upload_date && /^\d{8}$/.test(info.upload_date)) {
    const year = info.upload_date.slice(0, 4);
    set('date', `${year}-${info.upload_date.slice(4,6)}-${info.upload_date.slice(6,8)}`);
    set('year', year);
  } else if (info.timestamp) {
    set('year', String(new Date(info.timestamp * 1000).getFullYear()));
  }

  return args;
}

async function downloadThumbnail(thumbnailUrl) {
  if (!thumbnailUrl) return null;
  const tmpName = `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const tmpPath = path.join(config.dataDir, tmpName);
  try {
    const res = await axios.get(thumbnailUrl, {
      responseType: 'arraybuffer',
      timeout: 10000,
      maxContentLength: 5 * 1024 * 1024,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    fs.writeFileSync(tmpPath, res.data);
    return tmpPath;
  } catch (e) {
    logger.warn(`[metadata] thumbnail download failed: ${e.message}`);
    return null;
  }
}

function rm(p) { if (p) { try { fs.unlinkSync(p); } catch {} } }

async function embedMetadataInPlace(inputPath, info = {}) {
  if (!fs.existsSync(inputPath)) {
    return { success: false, error: `input file not found: ${inputPath}` };
  }

  let thumbPath = null;
  if (info && info.thumbnail) {
    thumbPath = await downloadThumbnail(info.thumbnail);
  }

  const ext = path.extname(inputPath);
  const tempOutput = inputPath.slice(0, inputPath.length - ext.length) + '.meta' + ext;
  const ffmpegBin = config.ffmpegPath && config.ffmpegPath.length ? config.ffmpegPath : 'ffmpeg';
  const args = ['-y', '-i', inputPath];
  if (thumbPath) args.push('-i', thumbPath);

  args.push('-map', '0');
  if (thumbPath) {
    args.push('-map', '1:v:0');
    args.push('-c:v:1', 'copy');
    args.push('-disposition:v:1', 'attached_pic');
    args.push('-metadata:s:v:1', 'title=Album cover');
    args.push('-metadata:s:v:1', 'comment=Cover (front)');
  }

  args.push('-c', 'copy');
  args.push(...buildLightMetadataArgs(info));

  const extLower = ext.toLowerCase();
  if (extLower === '.mp4' || extLower === '.m4a' || extLower === '.mov') {
    args.push('-movflags', '+faststart');
  }
  if (extLower === '.mp3') {
    args.push('-id3v2_version', '3');
    args.push('-write_id3v1', '1');
  }

  args.push(tempOutput);

  return new Promise((resolve) => {
    let stderr = '';
    let child;
    try {
      child = spawn(ffmpegBin, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (err) {
      rm(thumbPath); rm(tempOutput);
      return resolve({ success: false, error: `failed to spawn ffmpeg: ${err.message}` });
    }
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => {
      rm(thumbPath); rm(tempOutput);
      resolve({ success: false, error: err.message });
    });
    child.on('close', (code) => {
      rm(thumbPath);
      if (code !== 0) {
        rm(tempOutput);
        return resolve({ success: false, error: stderr.slice(-200) || `ffmpeg exited ${code}` });
      }
      if (!fs.existsSync(tempOutput)) {
        return resolve({ success: false, error: 'ffmpeg produced no output file' });
      }
      try {
        fs.renameSync(tempOutput, inputPath);
        resolve({ success: true, embedded: true });
      } catch (e) {
        rm(tempOutput);
        resolve({ success: false, error: `rename failed: ${e.message}` });
      }
    });
  });
}

module.exports = { embedMetadataInPlace, EMBED_ENABLED };
