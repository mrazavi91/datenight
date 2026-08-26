import "dotenv/config";
import express from "express";
import session from "express-session";
import SQLiteStoreFactory from "connect-sqlite3";
import http from "http";
import path from "path";
import passport from "./auth";
import { migrate } from "./db";
import authRoutes from "./routes/auth";
import coupleRoutes from "./routes/couples";
import invitationRoutes from "./routes/invitations";
import notificationRoutes from "./routes/notifications";
import { setupVite, serveStatic } from "./vite";

migrate();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const SQLiteStore = SQLiteStoreFactory(session);
const dataDir = path.resolve(import.meta.dirname, "..", "data");

app.set("trust proxy", 1);
app.use(
  session({
    store: new SQLiteStore({ dir: dataDir, db: "sessions.db" }) as any,
    secret: process.env.SESSION_SECRET || "date-night-dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.FORCE_HTTPS === "true",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api/auth", authRoutes);
app.use("/api/couples", coupleRoutes);
app.use("/api/invitations", invitationRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
});

const server = http.createServer(app);

async function main() {
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    await setupVite(app, server);
  }

  const port = Number(process.env.PORT) || 5000;
  server.listen(port, "0.0.0.0", () => {
    console.log(`Date Night server running on http://localhost:${port}`);
  });
}

main();
