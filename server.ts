import 'dotenv/config';
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/api";
import { initDb } from "./server/db";

async function startServer() {
  // Initialize persistent datastore
  initDb();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CORS middleware for iframe and API cross-origin support
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  // Mount express.json with rawBody verification buffer for Paystack webhook signature validation
  app.use(express.json({
    limit: '100mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    }
  }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // Mount static uploads directory for permanent storage of avatars and receipts
  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  const avatarsDir = path.join(uploadsDir, "avatars");
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }
  const docsDir = path.join(uploadsDir, "documents");
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));

  // Mount API routes FIRST before frontend middleware
  app.use("/api", apiRouter);

  // Global Error Handler for Payload Too Large
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413 || err.name === 'PayloadTooLargeError') {
      return res.status(413).json({
        error: 'Payload Too Large: The uploaded files or request data exceed the maximum size. Please upload compressed or smaller files.'
      });
    }
    next(err);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`BAZERIGHTVERIFY server listening on http://0.0.0.0:${PORT}`);
  });

  // Ensure Node HTTP server doesn't prematurely drop socket connections before 2-minute API timeout
  server.requestTimeout = 150000; // 2.5 minutes
  server.headersTimeout = 155000;
  server.keepAliveTimeout = 150000;
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
