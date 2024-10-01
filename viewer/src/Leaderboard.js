import React, { useEffect, useState } from "react";
import { useSocket } from "./SocketProvider"; // Get the socket from context

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const socket = useSocket(); // Access the socket

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("http://localhost:4000/leaderboard"); // Replace with your deployed backend URL if applicable
      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  useEffect(() => {
    // Fetch leaderboard initially when component mounts
    fetchLeaderboard();

    if (!socket) return;

    // Listen for leaderboard updates from the server
    socket.on("leaderboardUpdate", () => {
      console.log("Leaderboard update received");
      fetchLeaderboard(); // Re-fetch leaderboard when the server emits an update
    });

    return () => {
      socket.off("leaderboardUpdate"); // Clean up the event listener
    };
  }, [socket]);

  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.length > 0 ? (
            leaderboard.map((user, index) => (
              <tr key={user.username}>
                <td>{index + 1}</td>
                <td>{user.username}</td>
                <td>{user.score}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">Loading leaderboard...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
