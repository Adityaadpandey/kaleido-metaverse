import dotenv from "dotenv";
import express from "express";
import http from "http";
import { createWebSocketServer } from "./index.js";

// Load environment variables
dotenv.config();

// Create HTTP server
const app = express();
const server = http.createServer(app);

// Set up the WebSocket server
const wsServer = createWebSocketServer(server);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Enable CORS for development
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  next();
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
