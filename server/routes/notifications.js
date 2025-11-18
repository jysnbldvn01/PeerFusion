const express = require('express');
const router = express.Router();
const authenticateToken = require("../middleware/auth");

// Accept a session/chat request
router.post('/accept/:id', authenticateToken, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  const db = req.app.get("db");
  const emitToUser = req.app.get("emitToUser");

  try {
    // 1. Mark notification as accepted
    await db.query(
      `UPDATE notifications 
         SET status = 'accepted' 
       WHERE id = ? AND receiver_id = ?`,
      [notificationId, userId]
    );

    // 2. Find the sender of this notification
    const [rows] = await db.query(
      `SELECT sender_id FROM notifications WHERE id = ?`,
      [notificationId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const peerId = rows[0].sender_id;

    // 3. Find or create a conversation row between userId and peerId
    const [convRows] = await db.query(
      `SELECT id FROM conversations 
         WHERE (user1_id = ? AND user2_id = ?) 
            OR (user1_id = ? AND user2_id = ?) 
         LIMIT 1`,
      [userId, peerId, peerId, userId]
    );

    let conversationId;
    if (convRows.length > 0) {
      conversationId = convRows[0].id;
    } else {
      const [result] = await db.query(
        `INSERT INTO conversations (user1_id, user2_id, created_at) 
         VALUES (?, ?, NOW())`,
        [userId, peerId]
      );
      conversationId = result.insertId;
    }

    // 4. Notify both users over socket.io
    emitToUser(peerId, "sessionAccepted", { conversationId });
    emitToUser(userId, "sessionAccepted", { conversationId });

    // 5. Create a notification to inform the original requester that their request was accepted (include acceptor name)
    let acceptorName = 'Someone';
    try {
      const [nameRows] = await db.query(
        `SELECT name FROM users WHERE id = ? LIMIT 1`,
        [userId]
      );
      if (nameRows && nameRows.length) acceptorName = nameRows[0].name || acceptorName;
    } catch (_) {}

    await db.query(
      `INSERT INTO notifications 
       (sender_id, receiver_id, message, type, status) 
       VALUES (?, ?, ?, 'session_accept', 'accepted')`,
      [
        userId,      // acceptor
        peerId,      // original requester
        `✅ ${acceptorName} accepted your session request`,
      ]
    );

    // 6. Respond to frontend
    return res.json({
      success: true,
      message: 'Session request accepted',
      conversationId,
      peerId,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err });
  }
});

// Reject a session/chat request
router.post('/reject/:id', authenticateToken, async (req, res) => {
  const notificationId = req.params.id;
  const userId = req.user.id;

  const db = req.app.get("db");

  try {
    await db.query(
      `UPDATE notifications 
         SET status = 'rejected' 
       WHERE id = ? AND receiver_id = ?`,
      [notificationId, userId]
    );

    res.json({ success: true, message: 'Session request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err });
  }
});

module.exports = router;