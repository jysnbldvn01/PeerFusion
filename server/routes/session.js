const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");

// Create session request
router.post("/request", async (req, res) => {
  try {
    const db = req.app.get("db");
    const emitToUser = req.app.get("emitToUser");
    const { requester_id, receiver_id } = req.body;

    if (!requester_id || !receiver_id) {
      return res.status(400).json({ error: "Missing requester_id or receiver_id" });
    }

    console.log("📨 Creating chat request:", requester_id, "→", receiver_id);

    // Insert chat request in PlanetScale
    const [insertResult] = await db.query(
      "INSERT INTO chat_requests (requester_id, receiver_id, status) VALUES (?, ?, 'pending')",
      [requester_id, receiver_id]
    );
    const requestId = insertResult.insertId;

    // Insert notification
    await db.query(
      `INSERT INTO notifications 
       (sender_id, receiver_id, request_id, session_request_id, message, type, status) 
       VALUES (?, ?, ?, ?, ?, 'session_request', 'pending')`,
      [
        requester_id,
        receiver_id,
        requestId,
        requestId,
        "📅 You have a new session request",
      ]
    );

    // Notify the receiver via Socket.IO
    if (emitToUser) {
      emitToUser(receiver_id, "sessionRequested", {
        requestId,
        requester_id,
      });
    }

    res.json({ success: true, requestId });
  } catch (err) {
    console.error("❌ Error creating request:", err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

//  Accept session request
router.post("/accept", async (req, res) => {
  try {
    const db = req.app.get("db");
    const firestore = req.app.get("firestore");
    const emitToUser = req.app.get("emitToUser");
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "Missing requestId" });
    }

    // Update chat request status
    await db.query("UPDATE chat_requests SET status='accepted' WHERE id=?", [requestId]);

    // Fetch participants and request details
    const [rows] = await db.query(
      "SELECT requester_id, receiver_id FROM chat_requests WHERE id=?",
      [requestId]
    );
    if (!rows?.length) {
      return res.status(404).json({ error: "Request not found" });
    }

    const { requester_id, receiver_id } = rows[0];

    // Get both user profiles
    const [profiles] = await db.query(
      "SELECT user_id, username, avatar FROM user_profiles WHERE user_id IN (?, ?)",
      [requester_id, receiver_id]
    );

    const userInfoMap = {};
    profiles.forEach((p) => {
      userInfoMap[String(p.user_id)] = {
        username: p.username || `User ${p.user_id}`,
        avatar: p.avatar
          ? `${req.protocol}://${req.get("host")}/uploads/${p.avatar}`
          : `${req.protocol}://${req.get("host")}/uploads/default.png`,
      };
    });

    // Ensure both users exist in the map
    [requester_id, receiver_id].forEach((id) => {
      if (!userInfoMap[String(id)]) {
        userInfoMap[String(id)] = {
          username: `User ${id}`,
          avatar: `${req.protocol}://${req.get("host")}/uploads/default.png`,
        };
      }
    });

    // Check if a conversation already exists
    const snapshot = await firestore
      .collection("conversations")
      .where("participants", "array-contains", requester_id)
      .get();

    let existingConversation = null;
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (Array.isArray(data.participants) && data.participants.includes(receiver_id)) {
        existingConversation = { id: docSnap.id, ...data };
      }
    });

    // Create new conversation if none exists
    let conversationId;
    if (existingConversation) {
      conversationId = existingConversation.id;
    } else {
      conversationId = uuidv4();
      await firestore.collection("conversations").doc(conversationId).set({
        participants: [requester_id, receiver_id],
        userInfo: {
          [String(requester_id)]: userInfoMap[String(requester_id)],
          [String(receiver_id)]: userInfoMap[String(receiver_id)],
        },
        sessionRequest: {
          requestId: requestId,
          requesterId: requester_id,
          receiverId: receiver_id,
          acceptedAt: new Date()
        },
        lastMessage: "",
        lastMessageTime: null,
        createdAt: new Date(),
      });
    }

    // Notify both users via socket
    if (emitToUser) {
      emitToUser(requester_id, "sessionAccepted", {
        conversationId,
        otherUserId: receiver_id,
      });
      emitToUser(receiver_id, "sessionAccepted", {
        conversationId,
        otherUserId: requester_id,
      });
    }

    // Update notification status
    await db.query(
      "UPDATE notifications SET status='accepted' WHERE session_request_id=?",
      [requestId]
    );

    // Create notification for the requester that their request was accepted (include acceptor name)
    await db.query(
      `INSERT INTO notifications 
       (sender_id, receiver_id, request_id, session_request_id, message, type, status) 
       VALUES (?, ?, ?, ?, ?, 'session_accept', 'accepted')`,
      [
        receiver_id, // sender is the acceptor
        requester_id, // receiver is the original requester
        requestId,
        requestId,
        `✅ ${userInfoMap[String(receiver_id)].username} accepted your session request`,
      ]
    );

    res.json({ success: true, conversationId });
  } catch (err) {
    console.error("❌ Error accepting request:", err);
    res.status(500).json({ error: "Failed to accept request" });
  }
});

// Reject session request
router.post("/reject", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ error: "Missing requestId" });
    }

    await db.query("UPDATE chat_requests SET status='rejected' WHERE id=?", [requestId]);
    await db.query(
      "UPDATE notifications SET status='rejected' WHERE session_request_id=?",
      [requestId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error rejecting request:", err);
    res.status(500).json({ error: "Failed to reject request" });
  }
});

// Get unique session partners count for a user
router.get("/unique-partners/:userId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { userId } = req.params;

    // Find all accepted session pairs where the user was involved
    const [rows] = await db.query(
      `SELECT requester_id, receiver_id 
       FROM chat_requests 
       WHERE status = 'accepted' 
       AND (requester_id = ? OR receiver_id = ?)`,
      [userId, userId]
    );

    if (!rows.length) {
      return res.json({ count: 0 });
    }

    // Collect unique partner IDs
    const uniquePartners = new Set();
    rows.forEach((r) => {
      if (r.requester_id === Number(userId)) uniquePartners.add(r.receiver_id);
      else uniquePartners.add(r.requester_id);
    });

    res.json({ count: uniquePartners.size });
  } catch (err) {
    console.error("❌ Error fetching unique partners count:", err);
    res.status(500).json({ error: "Failed to fetch unique partners count" });
  }
});

// Check if user can schedule meeting for conversation
router.get("/can-schedule/:conversationId/:userId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const firestore = req.app.get("firestore");
    const { conversationId, userId } = req.params;

    // Get conversation from Firestore
    const convDoc = await firestore.collection("conversations").doc(conversationId).get();
    if (!convDoc.exists) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const conversation = convDoc.data();
    
    // Check if this conversation has session request data
    if (conversation.sessionRequest) {
      const { requesterId, receiverId } = conversation.sessionRequest;
      
      // Only the receiver can schedule meetings
      const canSchedule = Number(userId) === Number(receiverId);
      
      return res.json({ 
        canSchedule,
        userRole: Number(userId) === Number(requesterId) ? 'requester' : 'receiver'
      });
    }

    // For conversations without session request data, allow both users to schedule
    res.json({ canSchedule: true, userRole: 'both' });
  } catch (err) {
    console.error("❌ Error checking schedule permission:", err);
    res.status(500).json({ error: "Failed to check schedule permission" });
  }
});

module.exports = router;