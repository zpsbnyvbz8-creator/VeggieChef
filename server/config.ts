import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

// Helmet configured for AI Studio preview, iFrame embedding, Unsplash images, and Firebase endpoints
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://images.unsplash.com",
        "https://*.unsplash.com",
      ],
      connectSrc: [
        "'self'",
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "https://*.identitytoolkit.googleapis.com",
        "https://firestore.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
      ],
      frameAncestors: [
        "'self'",
        "https://*.google.com",
        "https://*.run.app",
        "https://ai.studio",
        "https://*.aistudio.google.com",
      ],
      mediaSrc: ["'self'", "data:", "blob:"],
    },
  },
  xFrameOptions: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// CORS middleware allowing app domain, local preview, and cloud run origins
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const appUrl = process.env.APP_URL;
    if (appUrl && origin.startsWith(appUrl)) {
      return callback(null, true);
    }
    if (
      origin.endsWith(".vercel.app") ||
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("run.app") ||
      origin.includes("google.com") ||
      origin.includes("ai.studio")
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
});

// Rate Limiting on AI endpoints to protect API quota
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Zu viele KI-Anfragen in kurzer Zeit. Bitte warte einen Moment, bevor du eine neue Anfrage startest.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
