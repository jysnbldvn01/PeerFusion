const express = require("express");
const router = express.Router();

// Fetch all conversations for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const userId = req.params.userId;

    const [rows] = await db.query(
      `SELECT c.id, c.user1_id, c.user2_id, c.created_at,
              CASE WHEN c.user1_id = ? THEN u2.id ELSE u1.id END AS other_user_id,
              CASE WHEN c.user1_id = ? THEN u2.name ELSE u1.name END AS other_user_name,
              CASE WHEN c.user1_id = ? THEN u2.avatar ELSE u1.avatar END AS other_user_avatar,
              (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_time
       FROM conversations c
       JOIN users u1 ON u1.id = c.user1_id
       JOIN users u2 ON u2.id = c.user2_id
       WHERE c.user1_id = ? OR c.user2_id = ?
       ORDER BY last_message_time DESC`,
      [userId, userId, userId, userId, userId]
    );

    res.json({ conversations: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Fetch single conversation details
router.get("/:conversationId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { conversationId } = req.params;
    const userId = req.query.userId;

    const [rows] = await db.query(
      `SELECT c.id, c.user1_id, c.user2_id, c.created_at,
              CASE WHEN c.user1_id = ? THEN u2.id ELSE u1.id END AS other_user_id,
              CASE WHEN c.user1_id = ? THEN u2.name ELSE u1.name END AS other_user_name,
              CASE WHEN c.user1_id = ? THEN u2.avatar ELSE u1.avatar END AS other_user_avatar
       FROM conversations c
       JOIN users u1 ON u1.id = c.user1_id
       JOIN users u2 ON u2.id = c.user2_id
       WHERE c.id = ?`,
      [userId, userId, userId, conversationId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching conversation:", err);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

module.exports = router;