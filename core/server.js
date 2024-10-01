const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const UserSchema = new mongoose.Schema({
  username: String,
  score: { type: Number, default: 0 },
});
const User = mongoose.model("User", UserSchema);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({ origin: "*", credentials: true }));

let currentProblem = null;
let answer = null;
let problemLocked = false;

const generateProblem = () => {
  const num1 = Math.floor(Math.random() * 100);
  const num2 = Math.floor(Math.random() * 100);

  currentProblem = `${num1} + ${num2}`;
  answer = (num1 + num2).toString();
  console.log(`Generated Problem: ${currentProblem}, Answer: ${answer}`);
  return currentProblem;
};

const broadcastProblem = () => {
  console.log(`Broadcasting Problem: ${currentProblem}`);
  io.emit("newProblem", { problem: currentProblem });
};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  if (currentProblem) {
    socket.emit("newProblem", { problem: currentProblem });
  }

  socket.on("submitAnswer", async ({ username, userAnswer }) => {
    if (problemLocked) return;
    if (userAnswer === parseFloat(answer)) {
      problemLocked = true;
      io.emit("winner", { username });

      try {
        const updatedUser = await User.findOneAndUpdate(
          { username },
          { $inc: { score: 1 } },
          { new: true, upsert: true }
        );

        io.emit("scoreUpdate", { username, score: updatedUser.score });

        io.emit("leaderboardUpdate");

        setTimeout(() => {
          problemLocked = false;
          currentProblem = generateProblem();
          broadcastProblem();
        }, 2000);
      } catch (err) {
        console.log("Error updating score:", err);
        socket.emit("error", {
          message: "Failed to update your score. Please try again later.",
        });
      }
    } else {
      socket.emit("incorrectAnswer", { username });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

setTimeout(() => {
  currentProblem = generateProblem();
  broadcastProblem();
}, 1000);

app.get("/leaderboard", async (req, res) => {
  try {
    const topUsers = await User.find().sort({ score: -1 }).limit(10);
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve leaderboard" });
  }
});

mongoose
  .connect(
    "mongodb+srv://test:test@cluster0.rpqul.mongodb.net/quizapp?retryWrites=true&w=majority"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
