import React, { createContext, useContext, useEffect, useState } from "react";
import io from "socket.io-client";

// Create a context for the socket
const SocketContext = createContext();

// Custom hook to use the socket context
export const useSocket = () => {
  return useContext(SocketContext);
};

const SOCKET_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:4000"; // Change this to your backend URL

// Create a provider component
export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Create the socket connection only once
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
    });

    // Save the socket instance
    setSocket(newSocket);

    // Cleanup on component unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};
