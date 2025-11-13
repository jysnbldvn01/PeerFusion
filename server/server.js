// server.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: './.env' });

const db = require('./config/db');

// ===========================
// Initialize Firebase
// ===========================
const initializeFirebase = () => {
  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    const serviceAccountPath = '/etc/secrets/serviceAccountKey.json';
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`Firebase service account file not found at ${serviceAccountPath}`);
      process.exit(1);
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  return require('firebase-admin').firestore();
};

// ===========================
// Configure Socket.IO
// ===========================
const configureSocketIO = (server, firestore) => {
  const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

  const io = new Server(server, {
    cors: { origin: allowedOrigin, methods: ['GET', 'POST'] },
  });

  const userSockets = new Map();

  const emitToUser = (userId, event, payload) => {
    const socketId = userSockets.get(String(userId));
    if (socketId) io.to(socketId).emit(event, payload);
  };

  const handleSocketConnection = (socket) => {
    socket.on('identify', ({ userId }) => {
      if (userId) userSockets.set(String(userId), socket.id);
    });

    socket.on('joinConversation', ({ conversationId }) => {
      if (conversationId) socket.join(`conv_${conversationId}`);
    });

    socket.on('sendMessage', handleSendMessage(socket, firestore, io));

    socket.on('disconnect', () => handleSocketDisconnect(socket, userSockets));
  };

  io.on('connection', handleSocketConnection);

  return { io, emitToUser };
};

// ===========================
// Handle Message Sending
// ===========================
const handleSendMessage = (socket, firestore, io) => async ({
  conversationId,
  senderId,
  content,
  senderName,
  senderAvatar,
}) => {
  if (!conversationId || !senderId || !content?.trim()) return;

  try {
    const admin = require('firebase-admin');

    const messageRef = await firestore.collection('messages').add({
      conversationId,
      senderId,
      senderName: senderName || '',
      senderAvatar: senderAvatar || '',
      content: content.trim(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await firestore.collection('conversations').doc(conversationId).update({
      lastMessage: content.trim(),
      lastMessageTime: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    const newMessage = {
      id: messageRef.id,
      conversationId,
      senderId,
      senderName: senderName || '',
      senderAvatar: senderAvatar || '',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    io.to(`conv_${conversationId}`).emit('receiveMessage', newMessage);
  } catch (err) {
    console.error('sendMessage Firestore error:', err);
  }
};

// ===========================
// Handle Socket Disconnect
// ===========================
const handleSocketDisconnect = (socket, userSockets) => {
  for (const [userId, socketId] of userSockets.entries()) {
    if (socketId === socket.id) {
      userSockets.delete(userId);
      break;
    }
  }
};

// ===========================
// Configure Routes
// ===========================
const configureRoutes = (app) => {
  const routes = [
    '/api/admin',
    '/api/auth',
    '/api/profile',
    '/api/jitsi',
    '/api/notifications',
    '/api/session',
    '/api/messages',
    '/api/conversations',
    '/api/FirebaseToken',
    '/api/meeting',
    '/api/reports',
    '/api/appeals',
    '/api/support',
  ];

  routes.forEach((route) => {
    const routePath = route.split('/api')[1];
    try {
      const routeModule = require(`./routes${routePath}`);
      app.use(route, routeModule);
      console.log(`Route configured: ${route}`);
    } catch (error) {
      console.error(`Failed to load route ${route}:`, error.message);
    }
  });
};

// ===========================
// Start Server
// ===========================
const startServer = () => {
  const firestore = initializeFirebase();
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  configureRoutes(app);

  const server = http.createServer(app);
  const { emitToUser } = configureSocketIO(server, firestore);

  app.set('db', db);
  app.set('firestore', firestore);
  app.set('emitToUser', emitToUser);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

// ===========================
// Database Connection
// ===========================
db.getConnection()
  .then((conn) => {
    console.log('Database connected successfully');
    conn.release();
    startServer();
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });
