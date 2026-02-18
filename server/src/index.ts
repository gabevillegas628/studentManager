import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import requestRoutes from "./routes/requests";
import userRoutes from "./routes/users";
import courseRoutes from "./routes/courses";
import settingsRoutes from "./routes/settings";
import { errorHandler } from "./middleware/errorHandler";
import { startDigestScheduler } from "./scheduler/digestScheduler";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
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
