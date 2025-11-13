import { io } from "socket.io-client";
const SOCKET_URL = process.env.REACT_APP_API_URL;

export const socket = io(SOCKET_URL, { autoConnect: false });

export function identifySocket(userId) {
  if (!userId) return;
  if (!socket.connected) socket.connect();
  socket.emit("identify", { userId });
}