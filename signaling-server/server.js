const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.get("/", (req, res) => res.send("Signaling server running"));

// rooms: { roomId: [socketId, ...] }
const rooms = {};

io.on("connection", (socket) => {
  // Join a room
  socket.on("join-room", ({ roomId, userName, role }) => {
    socket.join(roomId);
    socket.data = { roomId, userName, role };

    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push({ id: socket.id, userName, role });

    // Tell others in room someone joined
    socket.to(roomId).emit("user-joined", { id: socket.id, userName, role });

    // Send existing peers to the new joiner
    const peers = rooms[roomId].filter((p) => p.id !== socket.id);
    socket.emit("existing-peers", peers);
  });

  // WebRTC signaling relay
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", { from: socket.id, offer, userName: socket.data?.userName });
  });

  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", { from: socket.id, answer });
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", { from: socket.id, candidate });
  });

  // Screen share toggle broadcast
  socket.on("screen-share", ({ roomId, sharing }) => {
    socket.to(roomId).emit("screen-share", { from: socket.id, userName: socket.data?.userName, sharing });
  });

  // Disconnect
  socket.on("disconnect", () => {
    const { roomId } = socket.data || {};
    if (roomId && rooms[roomId]) {
      rooms[roomId] = rooms[roomId].filter((p) => p.id !== socket.id);
      socket.to(roomId).emit("user-left", { id: socket.id, userName: socket.data?.userName });
    }
  });
});

server.listen(3001, () => console.log("Signaling server running on http://localhost:3001"));
