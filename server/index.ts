import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import { getDirname } from "./dirname";

const __dirname = getDirname(import.meta.url);

let easeProcess: ChildProcess | null = null;

function startEASEService() {
  const easeServicePath = path.join(__dirname, "ease_service", "main.py");
  const easePort = process.env.EASE_PORT || "6334";
  
  console.log(`[EASE] Starting EASE service on port ${easePort}...`);
  
  easeProcess = spawn("python", [easeServicePath], {
    env: { ...process.env, EASE_PORT: easePort },
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });
  
  easeProcess.stdout?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    lines.forEach((line: string) => console.log(`[EASE] ${line}`));
  });
  
  easeProcess.stderr?.on("data", (data: Buffer) => {
    const lines = data.toString().split("\n").filter(Boolean);
    lines.forEach((line: string) => console.log(`[EASE] ${line}`));
  });
  
  easeProcess.on("error", (err) => {
    console.error("[EASE] Failed to start EASE service:", err);
  });
  
  easeProcess.on("exit", (code) => {
    console.log(`[EASE] Service exited with code ${code}`);
    easeProcess = null;
  });
}

process.on("SIGINT", () => {
  if (easeProcess) {
    easeProcess.kill();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  if (easeProcess) {
    easeProcess.kill();
  }
  process.exit(0);
});

// In production the EASE FastAPI service runs in its own container
// (see docker-compose.yml). Set START_EASE_SERVICE=false to disable the
// in-process spawn.
if (process.env.START_EASE_SERVICE !== "false") {
  startEASEService();
}

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
