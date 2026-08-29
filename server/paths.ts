import path from "path";
import fs from "fs";

// Deliberately based on process.cwd(), not import.meta.dirname: esbuild bundles the whole
// server into a single dist/server/index.js file for production, which would put
// import.meta.dirname-relative paths under dist/ — a build output directory that a fresh
// deploy regenerates from scratch, silently wiping the database and uploaded photos on
// every redeploy. process.cwd() is the project root in both `npm run dev` (tsx, from
// source) and `npm start` (node dist/server/index.js), as long as both are launched from
// the repo root — which they are. Override with DATA_DIR if your host mounts a persistent
// volume somewhere else.
export const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.resolve(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
