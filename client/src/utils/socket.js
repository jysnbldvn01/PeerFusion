// client/src/utils/socket.js
import { io } from "socket.io-client";
const SOCKET_URL = process.env.REACT_APP_API_URL || "https://peerfusion-xh73.onrender.com";

export const socket = io(SOCKET_URL, { 
  autoConnect: false,
  transports: ['websocket', 'polling']
});

export function identifySocket(userId) {
  if (!userId) {
    console.warn('No userId provided for socket identification');
    return;
  }
  
  try {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("identify", { userId });
    console.log(`Socket identified for user: ${userId}`);
  } catch (error) {
    console.error('Socket identification failed:', error);
  }
}