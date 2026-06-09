const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const logger = require('../utils/logger');

const PRIORITY = { high: 0, normal: 1, low: 2 };
const STATES = { pending: 'pending', downloading: 'downloading', processing: 'processing', completed: 'completed', failed: 'failed' };

class QueueService {
  constructor() {
    this.jobs = new Map();
    this.batches = new Map();
    this.maxConcurrency = parseInt(process.env.QUEUE_MAX_CONCURRENCY || '3', 10);
    this.running = 0;
    this.rateLimit = parseInt(process.env.QUEUE_RATE_LIMIT_PER_MIN || '30', 10);
    this.ipTimestamps = new Map();
    this.processor = null;
  }

  setProcessor(fn) {
    this.processor = fn;
  }

  _ipKey(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  }

  checkRateLimit(req) {
    const ip = this._ipKey(req);
    const now = Date.now();
    const windowMs = 60000;
    const timestamps = (this.ipTimestamps.get(ip) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= this.rateLimit) {
      return { allowed: false, ip, retryAfterMs: timestamps[0] + windowMs - now };
    }
    timestamps.push(now);
    this.ipTimestamps.set(ip, timestamps);
    return { allowed: true, ip };
  }

  enqueue(item, options = {}) {
    const jobId = uuidv4();
    const batchId = options.batchId || null;
    const priority = PRIORITY[options.priority] ?? PRIORITY.normal;

    const job = {
      id: jobId,
      batchId,
      url: item.url,
      type: item.type || 'video',
      format: item.format || undefined,
      resolution: item.resolution || undefined,
      quality: item.quality || undefined,
      audioFormat: item.audioFormat || undefined,
      priority,
      state: STATES.pending,
      result: null,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      progress: 0,
    };

    this.jobs.set(jobId, job);

    if (batchId && this.batches.has(batchId)) {
      this.batches.get(batchId).jobIds.push(jobId);
    }

    this._processNext();
    return job;
  }

  enqueueBatch(items, options = {}) {
    const batchId = uuidv4();
    const batch = {
      id: batchId,
      items: items.map((item) => ({
        url: item.url,
        type: item.type || options.type || 'video',
        format: item.format || options.format,
        resolution: item.resolution || options.resolution,
        quality: item.quality || options.quality,
        audioFormat: item.audioFormat || options.audioFormat,
        priority: item.priority || options.priority || 'normal',
      })),
      jobIds: [],
      state: 'pending',
      createdAt: Date.now(),
      completedAt: null,
    };
    this.batches.set(batchId, batch);

    for (const item of batch.items) {
      this.enqueue(item, { batchId, priority: item.priority });
    }

    return batch;
  }

  async _processNext() {
    if (this.running >= this.maxConcurrency) return;

    const pending = [...this.jobs.values()]
      .filter((j) => j.state === STATES.pending)
      .sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);

    if (pending.length === 0) return;

    const job = pending[0];
    job.state = STATES.downloading;
    job.startedAt = Date.now();
    this.running++;

    if (this.processor) {
      try {
        const result = await this.processor(job);
        job.state = STATES.completed;
        job.result = result;
      } catch (err) {
        job.state = STATES.failed;
        job.error = err.message || String(err);
        logger.error(`[Queue] Job ${job.id} failed: ${job.error}`);
      }
    } else {
      job.state = STATES.failed;
      job.error = 'No processor configured';
    }

    job.completedAt = Date.now();
    job.progress = job.state === STATES.completed ? 100 : 0;
    this.running--;

    this._checkBatchCompletion(job.batchId);
    this._processNext();
  }

  _checkBatchCompletion(batchId) {
    if (!batchId) return;
    const batch = this.batches.get(batchId);
    if (!batch) return;

    const jobs = batch.jobIds.map((id) => this.jobs.get(id)).filter(Boolean);
    const allDone = jobs.every((j) => j.state === STATES.completed || j.state === STATES.failed);
    if (allDone) {
      batch.state = 'completed';
      batch.completedAt = Date.now();
    }
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  getBatch(batchId) {
    const batch = this.batches.get(batchId);
    if (!batch) return null;
    const jobs = batch.jobIds.map((id) => this.jobs.get(id)).filter(Boolean);
    const completed = jobs.filter((j) => j.state === STATES.completed).length;
    const failed = jobs.filter((j) => j.state === STATES.failed).length;
    return {
      ...batch,
      total: jobs.length,
      completed,
      failed,
      pending: jobs.filter((j) => j.state === STATES.pending).length,
      active: jobs.filter((j) => j.state === STATES.downloading || j.state === STATES.processing).length,
      jobs: jobs.map((j) => ({
        id: j.id,
        url: j.url,
        type: j.type,
        state: j.state,
        progress: j.progress,
        result: j.result,
        error: j.error,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })),
    };
  }

  cancelJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.state === STATES.completed || job.state === STATES.failed) return false;
    job.state = STATES.failed;
    job.error = 'Cancelled by user';
    job.completedAt = Date.now();
    return true;
  }

  getQueueStatus() {
    const jobs = [...this.jobs.values()];
    return {
      maxConcurrency: this.maxConcurrency,
      running: this.running,
      pending: jobs.filter((j) => j.state === STATES.pending).length,
      downloading: jobs.filter((j) => j.state === STATES.downloading).length,
      completed: jobs.filter((j) => j.state === STATES.completed).length,
      failed: jobs.filter((j) => j.state === STATES.failed).length,
      total: jobs.length,
      rateLimit: this.rateLimit,
    };
  }

  getQueue(options = {}) {
    const { limit = 50, offset = 0, state } = options;
    let jobs = [...this.jobs.values()];
    if (state) jobs = jobs.filter((j) => j.state === state);
    jobs.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
    return {
      total: jobs.length,
      offset,
      limit,
      jobs: jobs.slice(offset, offset + limit).map((j) => ({
        id: j.id,
        batchId: j.batchId,
        url: j.url,
        type: j.type,
        state: j.state,
        priority: Object.keys(PRIORITY)[j.priority] || 'normal',
        progress: j.progress,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })),
    };
  }

  cleanup(maxAgeMs = 3600000) {
    const now = Date.now();
    for (const [id, job] of this.jobs) {
      if (
        (job.state === STATES.completed || job.state === STATES.failed) &&
        job.completedAt && (now - job.completedAt) > maxAgeMs
      ) {
        this.jobs.delete(id);
      }
    }
  }
}

module.exports = new QueueService();
