const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

// MongoDB Schema for User Score
const UserSchema = new mongoose.Schema({
  username: String,
  score: { type: Number, default: 0 },
});
const User = mongoose.model("User", UserSchema);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Allow frontend requests from any origin
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(cors({ origin: "*", credentials: true }));

let currentProblem = null;
let answer = null;
let problemLocked = false;

// Function to generate a new random addition problem
const generateProblem = () => {
  const num1 = Math.floor(Math.random() * 100); // Random number between 0-99
  const num2 = Math.floor(Math.random() * 100); // Random number between 0-99

  currentProblem = `${num1} + ${num2}`; // Only addition
  answer = (num1 + num2).toString(); // Calculate the answer as a string
  console.log(`Generated Problem: ${currentProblem}, Answer: ${answer}`);
  return currentProblem;
};

// Function to broadcast a new problem to all connected users
const broadcastProblem = () => {
  console.log(`Broadcasting Problem: ${currentProblem}`);
  io.emit("newProblem", { problem: currentProblem });
};

// Handle user connections and submissions
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send the current problem to the newly connected user
  if (currentProblem) {
    socket.emit("newProblem", { problem: currentProblem });
  }

  // Handle user submissions
  socket.on("submitAnswer", async ({ username, userAnswer }) => {
    if (problemLocked) return; // Ignore submissions if problem is locked

    if (userAnswer === parseFloat(answer)) {
      problemLocked = true; // Lock the problem once the correct answer is submitted
      io.emit("winner", { username });

      try {
        // Update user score, increment by 1 if correct answer
        const updatedUser = await User.findOneAndUpdate(
          { username },
          { $inc: { score: 1 } },
          { new: true, upsert: true } // Create user if not found
        );

        io.emit("scoreUpdate", { username, score: updatedUser.score });

        // Emit leaderboard update to notify clients
        io.emit("leaderboardUpdate");

        // Generate a new problem after a 3-second delay
        setTimeout(() => {
          problemLocked = false;
          currentProblem = generateProblem();
          broadcastProblem();
        }, 3000);
      } catch (err) {
        console.log("Error updating score:", err);
        socket.emit("error", {
          message: "Failed to update your score. Please try again later.",
        });
      }
    } else {
      // Emit incorrect answer event
      socket.emit("incorrectAnswer", { username });
    }
  });

  // Handle user disconnections
  socket.on("disconnect", (reason) => {
    console.log(`User disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

// Generate the first problem when the server starts
setTimeout(() => {
  currentProblem = generateProblem();
  broadcastProblem();
}, 1000);

// Route to get the leaderboard (top 10 users)
app.get("/leaderboard", async (req, res) => {
  try {
    const topUsers = await User.find().sort({ score: -1 }).limit(10);
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve leaderboard" });
  }
});

// MongoDB Connection
mongoose
  .connect(
    "mongodb+srv://test:test@cluster0.rpqul.mongodb.net/quizapp?retryWrites=true&w=majority"
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Server listening on port 4000
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
