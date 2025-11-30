const express = require("express");
const router = express.Router();

// Get messages for a conversation
router.get("/:conversationId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { conversationId } = req.params;

    const [messages] = await db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, u.name AS sender_name, u.avatar AS sender_avatar, 
              m.content, m.created_at
       FROM messages m
       JOIN users u ON u.id = m.sender_id
       WHERE m.conversation_id = ?
       ORDER BY m.created_at ASC`,
      [conversationId]
    );

    res.json({ messages });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;