import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import authRoutes from "./routes/auth";
import requestRoutes from "./routes/requests";
import userRoutes from "./routes/users";
import courseRoutes from "./routes/courses";
import settingsRoutes from "./routes/settings";
import messagesRouter from "./routes/messages";
import { errorHandler } from "./middleware/errorHandler";
import { startDigestScheduler } from "./scheduler/digestScheduler";
import { getCourseIdsForUser } from "./services/courseUtils";
import { addClient, removeClient } from "./services/sseManager";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/messages", messagesRouter);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// SSE endpoint — JWT passed as ?token= query param (EventSource can't set headers)
app.get("/api/events", async (req, res) => {
  const rawToken = req.query.token as string;
  if (!rawToken) {
    res.status(401).json({ error: "No token provided" });
    return;
  }

  let user: { id: string; role: string } | null = null;
  try {
    user = jwt.verify(rawToken, JWT_SECRET) as { id: string; role: string };
  } catch {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  const courseIds = await getCourseIdsForUser(dbUser);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write("event: connected\ndata: {}\n\n");

  const connectionId = crypto.randomUUID();
  addClient(connectionId, courseIds, res);

  // Keep-alive every 25s to survive Railway proxy timeout
  const heartbeat = setInterval(() => res.write(": keep-alive\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(connectionId);
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../../client/dist");
  app.use(express.static(frontendPath));

  // Handle SPA routing - serve index.html for non-API routes
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startDigestScheduler();
});
