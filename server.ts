import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { helmetMiddleware, corsMiddleware, aiRateLimiter } from "./server/config";
import { aiRouter } from "./server/routes/ai";

dotenv.config();

const app = express();
const PORT = 3000;

// Trust reverse proxies (Google Cloud Run, Vercel, Docker)
app.set("trust proxy", 1);

// ---------------------------------------------------------------------------
// 1. Security Headers, CORS & Body Parser
// ---------------------------------------------------------------------------
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(express.json({ limit: "10mb" }));

// ---------------------------------------------------------------------------
// 2. REST API Routes
// ---------------------------------------------------------------------------
// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI endpoints (rate limited)
app.use("/api/ai", aiRateLimiter, aiRouter);

// Explicit 404 for unknown /api/* requests so client gets clean JSON instead of HTML
app.all("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "API-Endpunkt wurde nicht gefunden.",
    code: "NOT_FOUND",
  });
});

// ---------------------------------------------------------------------------
// 3. Global Error Handling Middleware
// ---------------------------------------------------------------------------
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error("[VeggieChef Server Error]", err?.message || err);
  const status = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(status).json({
    success: false,
    error: err?.message || "Ein unerwarteter Serverfehler ist aufgetreten.",
  });
});

// ---------------------------------------------------------------------------
// 4. Vite Middleware / Production Static Hosting & Lifecycle
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`VeggieChef Server running on http://0.0.0.0:${PORT}`);
  });

  // Cloud Run / load balancer keep-alive timeout harmonization
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  const handleShutdown = (signal: string) => {
    console.log(`Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("VeggieChef Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
}

// Global process error containment to prevent container crashes on unhandled async rejections
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Uncaught Exception]", error);
});

if (!process.env.VERCEL) {
  startServer();
}

export default app;
