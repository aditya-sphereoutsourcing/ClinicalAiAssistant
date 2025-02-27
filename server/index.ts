import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";

const app = express();

// Basic middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add detailed request logging
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
      if (req.body && Object.keys(req.body).length > 0) {
        logLine += ` Request: ${JSON.stringify(req.body)}`;
      }
      if (capturedJsonResponse) {
        logLine += ` Response: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error occurred: ${err.stack}`);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode...");
      await setupVite(app, server);
    } else {
      log("Setting up static serving in production mode...");
      serveStatic(app);
    }

    const port = process.env.PORT || 5000;
    server.listen(port, "0.0.0.0", () => {
      log(`Server started successfully on port ${port}`);
      log(`Server is accessible at http://0.0.0.0:${port}`);
    });
  } catch (err: any) {
    log(`Fatal error during server startup: ${err.stack}`);
    process.exit(1);
  }
})();