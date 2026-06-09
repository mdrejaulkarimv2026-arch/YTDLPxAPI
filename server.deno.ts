/**
 * Deno entry point for YT-DLP API Server.
 *
 * Leverages Deno 2's built-in Node.js compatibility layer to run the
 * existing Express server unchanged. All npm dependencies are resolved
 * via npm: specifiers configured in deno.json.
 *
 * Usage:
 *   deno task start          # production
 *   deno task dev            # watch mode
 *   deno run --allow-all server.deno.ts
 */

// @deno-types="npm:@types/express@^4"
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";

// Load .env via npm:dotenv (works under Deno's Node compat)
import dotenv from "dotenv";
dotenv.config();

const PORT = parseInt(Deno.env.get("PORT") || "3000", 10);
const DATA_DIR = path.resolve(Deno.env.get("DATA_DIR") || "./data");
const DOWNLOAD_DIR = path.resolve(Deno.env.get("DOWNLOAD_DIR") || "./downloads");

// Ensure directories exist
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.text({ limit: "50mb" }));

// Import the existing route modules (Deno can load .js via npm: compat)
// We dynamically import them to leverage the Node module resolution
const publicRoutes = await import("./routes/public.js");
const adminRoutes = await import("./routes/admin.js");

app.use("/downloads", express.static(DOWNLOAD_DIR));
app.use("/api", (publicRoutes as any).default || publicRoutes);
app.use("/api/admin", (adminRoutes as any).default || adminRoutes);

app.get("/", (_req, res) => {
  res.json({
    name: "YT-DLP API Server (Deno)",
    version: "2.2.0",
    runtime: `Deno ${Deno.version.deno}`,
    endpoints: {
      public: [
        "GET  /api/info?url=...",
        "GET  /api/embed?url=...",
        "GET  /api/formats?url=...",
        "GET  /api/dump?url=...",
        "GET  /api/search?q=...&limit=10",
        "GET  /api/playlist?url=...",
        "GET  /api/thumbnail?url=...&quality=maxres",
        "GET  /api/subtitles?url=...&lang=en",
        "GET  /api/download?url=...&type=video|audio&format=best",
        "GET  /api/download/save?url=...",
        "GET  /api/presets",
        "GET  /api/download/quality?url=...&quality=48k",
        "GET  /api/download/resolution?url=...&resolution=480p",
        "POST /api/convert?filename=...&format=mp3",
        "POST /api/transcode",
        "GET  /api/probe?filename=...",
        "GET  /api/status",
        "GET  /api/queue/status",
        "GET  /api/queue",
        "POST /api/batch",
        "GET  /api/batch/:id",
      ],
      admin: [
        "POST /api/admin/potoken",
        "POST /api/admin/cookies",
        "GET  /api/admin/status",
        "POST /api/admin/restart-provider",
      ],
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    runtime: `Deno ${Deno.version.deno}`,
    uptime: performance.now() / 1000,
    timestamp: Date.now(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: "Not found" });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack || err.message);
  res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 YT-DLP API Server (Deno) running on http://0.0.0.0:${PORT}`);
  console.log(`📁 Data dir: ${DATA_DIR}`);
  console.log(`📥 Downloads: ${DOWNLOAD_DIR}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => Deno.exit(0));
  setTimeout(() => Deno.exit(1), 10000);
};

Deno.addSignalListener("SIGTERM", () => shutdown("SIGTERM"));
Deno.addSignalListener("SIGINT", () => shutdown("SIGINT"));
