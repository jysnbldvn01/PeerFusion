// server.js
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: './.env' });

const db = require('./config/db');

const initializeFirebase = () => {
  const admin = require('firebase-admin');
  const serviceAccount = require('./serviceAccountKey.json');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.firestore();
};

const configureSocketIO = (server, firestore) => {
  const io = new Server(server, {
    cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
  });

  const userSockets = new Map();

  const emitToUser = (userId, event, payload) => {
    const socketId = userSockets.get(String(userId));
    if (socketId) io.to(socketId).emit(event, payload);
  };

  const handleSocketConnection = (socket) => {
    console.log('🟢 Socket connected:', socket.id);

    socket.on('identify', ({ userId }) => {
      if (userId) {
        userSockets.set(String(userId), socket.id);
        console.log(`Mapped user ${userId} -> socket ${socket.id}`);
      }
    });

    socket.on('joinConversation', ({ conversationId }) => {
      if (conversationId) {
        const room = `conv_${conversationId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
      }
    });

    socket.on('sendMessage', handleSendMessage(socket, firestore, io));

    socket.on('disconnect', () => handleSocketDisconnect(socket, userSockets));
  };

  io.on('connection', handleSocketConnection);

  return { io, emitToUser };
};

const handleSendMessage = (socket, firestore, io) => async ({ 
  conversationId, 
  senderId, 
  content, 
  senderName, 
  senderAvatar 
}) => {
  if (!conversationId || !senderId || !content?.trim()) return;

  try {
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
    console.error('❌ sendMessage Firestore error:', err);
  }
};

const handleSocketDisconnect = (socket, userSockets) => {
  console.log('🔴 Socket disconnected:', socket.id);
  for (const [userId, socketId] of userSockets.entries()) {
    if (socketId === socket.id) {
      userSockets.delete(userId);
      break;
    }
  }
};

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
    '/api/firebaseToken',
    '/api/meeting',
    '/api/reports'
  ];

  routes.forEach(route => {
    const routePath = route.split('/api')[1];
    try {
      app.use(route, require(`./routes${routePath}`));
      console.log(`✅ Route configured: ${route}`);
    } catch (error) {
      console.error(`❌ Failed to load route ${route}:`, error.message);
    }
  });
};

// Server startup
const startServer = () => {
  const firestore = initializeFirebase();
  const app = express();

  // Middleware
  app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
  app.use(express.json());
  app.use('/uploads', express.static('uploads'));

  // Configure routes
  configureRoutes(app);

  // Create server and configure Socket.IO
  const server = http.createServer(app);
  const { emitToUser } = configureSocketIO(server, firestore);

  // Set global utilities
  app.set('db', db);
  app.set('firestore', firestore);
  app.set('emitToUser', emitToUser);

  // Start server
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🎉 Server running on http://localhost:${PORT}`);
    console.log('✅ Database connected directly');
    console.log('✅ Socket.IO ready for real-time communication');
  });
};

// Database connection test
db.getConnection()
  .then(conn => {
    console.log('✅ Database connected successfully');
    conn.release();
    startServer();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });