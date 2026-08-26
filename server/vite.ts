import express from "express";
import path from "path";
import fs from "fs";
import viteConfig from "../vite.config";

export async function setupVite(app: express.Express, server: import("http").Server) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server } },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientIndex = path.resolve(import.meta.dirname, "..", "client", "index.html");
      let html = fs.readFileSync(clientIndex, "utf-8");
      html = await vite.transformIndexHtml(url, html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      vite.ssrFixStacktrace(err as Error);
      next(err);
    }
  });
}

export function serveStatic(app: express.Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "client");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find build directory: ${distPath}. Run "npm run build" first.`);
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}
