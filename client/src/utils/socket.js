import { io } from "socket.io-client";

const SOCKET_BASE_URL = process.env.NODE_ENV === 'production'
  ? process.env.REACT_APP_API_URL_PROD
  : process.env.REACT_APP_API_URL;
  
export const socket = io(SOCKET_BASE_URL, { autoConnect: false });

// call once after user logs in (or when app mounts if user known)
export function identifySocket(userId) {
  if (!userId) return;
  if (!socket.connected) socket.connect();
  socket.emit("identify", { userId });
}