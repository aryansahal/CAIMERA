import React, { useState, useEffect } from "react";
import { useSocket, SocketProvider } from "./SocketProvider"; // Import the context
import Leaderboard from "./Leaderboard";

function App() {
  const [problem, setProblem] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [username, setUsername] = useState("");
  const [winner, setWinner] = useState("");
  const [score, setScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState(null); // Track if the answer is correct

  const socket = useSocket(); // Get the socket from context

  useEffect(() => {
    if (!socket) return; // Ensure socket is initialized

    // Receive new problem from server
    socket.on("connect", () => {
      console.log("Connected to the server");
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from the server");
    });

    socket.on("newProblem", ({ problem }) => {
      console.log(`Received Problem: ${problem}`);
      setProblem(problem);
      setWinner("");
      setUserAnswer("");
      setIsCorrect(null); // Reset correct/incorrect status on new problem
    });

    // Handle when a user wins
    socket.on("winner", ({ username }) => {
      setWinner(`${username} is the winner!`);
      setIsCorrect(true); // Correct answer for the winner
    });

    // Handle when a user submits an incorrect answer
    socket.on("incorrectAnswer", ({ username: incorrectUsername }) => {
      if (incorrectUsername === username) {
        setIsCorrect(false); // Incorrect answer for the current user
      }
    });

    // Update user score
    socket.on(
      "scoreUpdate",
      ({ username: updatedUsername, score: updatedScore }) => {
        if (updatedUsername === username) {
          setScore(updatedScore);
        }
      }
    );

    return () => {
      socket.off("newProblem");
      socket.off("winner");
      socket.off("scoreUpdate");
      socket.off("incorrectAnswer");
    };
  }, [socket, username]);

  // Helper function to validate two decimal places
  const isValidAnswer = (value) => {
    const regex = /^\d+(\.\d{1,2})?$/; // Allow up to 2 decimal places
    return regex.test(value);
  };

  // Handle answer submission
  const handleSubmit = (e) => {
    e.preventDefault();

    if (username.trim() === "") {
      alert("Please enter a username before submitting an answer.");
      return;
    }

    if (userAnswer !== "" && isValidAnswer(userAnswer)) {
      const answer = parseFloat(userAnswer).toFixed(2); // Limit to 2 decimal places
      socket.emit("submitAnswer", {
        username,
        userAnswer: parseFloat(answer), // Send as float
      });
      setUserAnswer(""); // Clear the answer input after submission
    } else {
      alert("Please enter a valid number with up to 2 decimal places.");
    }
  };

  return (
    <div className="container">
      <div className="math-quiz">
        <h1>Math Quiz</h1>
        <h2>Current Problem: {problem ? problem : "Loading..."}</h2>

        {winner && <h3>{winner}</h3>}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your answer (up to 2 decimal places)"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
          <button type="submit">Submit Answer</button>
        </form>

        {/* Show incorrect answer feedback */}
        {isCorrect === false && (
          <p style={{ color: "red" }}>Incorrect answer, try again!</p>
        )}

        <h3>Your Score: {score}</h3>
      </div>
      <Leaderboard />
    </div>
  );
}

// Wrap the entire app in the SocketProvider
const AppWrapper = () => {
  return (
    <SocketProvider>
      <App />
    </SocketProvider>
  );
};

export default AppWrapper;
