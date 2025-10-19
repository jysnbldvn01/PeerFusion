import { io } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";
export const socket = io(SOCKET_URL, { autoConnect: false });

// call once after user logs in (or when app mounts if user known)
export function identifySocket(userId) {
  if (!userId) return;
  if (!socket.connected) socket.connect();
  socket.emit("identify", { userId });
}