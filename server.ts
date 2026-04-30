import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { neuralKeyManager } from "./src/lib/keyRotation";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = Number(process.env.PORT) || 3000;

  // Socket.io Logic
  const rooms = new Map();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomName) => {
      socket.join(roomName);
      if (!rooms.has(roomName)) {
        rooms.set(roomName, {
          name: roomName,
          users: [],
          timer: 25 * 60,
          isActive: false
        });
      }
      
      const room = rooms.get(roomName);
      const user = { id: socket.id, name: `Student ${rooms.get(roomName).users.length + 1}` };
      room.users.push(user);
      
      io.to(roomName).emit("room-data", room);
      console.log(`User ${socket.id} joined room ${roomName}`);
    });

    socket.on("toggle-timer", ({ roomName, isActive }) => {
      const room = rooms.get(roomName);
      if (room) {
        room.isActive = isActive;
        io.to(roomName).emit("timer-status", { isActive: room.isActive, timer: room.timer });
      }
    });

    socket.on("sync-timer", ({ roomName, timer }) => {
      const room = rooms.get(roomName);
      if (room) {
        room.timer = timer;
        socket.to(roomName).emit("timer-update", timer);
      }
    });

    socket.on("send-message", ({ roomName, text, userName }) => {
      io.to(roomName).emit("new-chat-message", {
        id: Date.now().toString(),
        userId: socket.id,
        userName,
        text,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      rooms.forEach((room, roomName) => {
        room.users = room.users.filter(u => u.id !== socket.id);
        if (room.users.length === 0) {
          rooms.delete(roomName);
        } else {
          io.to(roomName).emit("room-data", room);
        }
      });
    });
  });

  // API Routes
  app.use(express.json());

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/gemini", async (req, res) => {
    const { model, prompt, contents, config } = req.body;
    const maxAttempts = Math.min(neuralKeyManager.getKeyCount(), 5);
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const apiKey = neuralKeyManager.getNextKey();
        if (!apiKey) {
          return res.status(500).json({ error: "No API key configured on server." });
        }

        const genAI = new GoogleGenAI({ apiKey });
        const modelName = model || "gemini-3-flash-preview";

        let response;
        if (contents) {
          response = await genAI.models.generateContent({
            model: modelName,
            contents,
            ...config
          });
        } else {
          response = await genAI.models.generateContent({
            model: modelName,
            contents: [{ parts: [{ text: prompt }] }]
          });
        }

        const candidates = response.candidates || [];
        const audioPart = candidates[0]?.content?.parts?.find((p: any) => p.inlineData);
        
        return res.json({ 
          text: response.text || (candidates[0]?.content?.parts?.[0]?.text),
          audioData: audioPart?.inlineData?.data,
          fullResponse: response 
        });
      } catch (error: any) {
        lastError = error;
        const errorMsg = error.message || "";
        
        // If it's a rate limit error, try the next key
        if (errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
          console.warn(`[Neural Node ${attempt + 1}] Rate limited. Rotating to next cluster node...`);
          continue;
        }
        
        // For other errors, break and report
        break;
      }
    }

    console.error("Gemini Proxy Final Error:", lastError);
    res.status(lastError?.status || 500).json({ 
      error: lastError?.message || "All neural nodes are currently at capacity.",
      details: lastError?.stack 
    });
  });

  // Vite Middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
