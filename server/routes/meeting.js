const express = require("express");
const router = express.Router();
const schedule = require("node-schedule");

// 🟢 Schedule a meeting
router.post("/schedule", async (req, res) => {
  try {
    const db = req.app.get("db");
    const emitToUser = req.app.get("emitToUser");
    const { conversationId, participants, scheduledAt } = req.body;

    if (!conversationId || !participants?.length || !scheduledAt) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Save meeting
    const [result] = await db.query(
      `INSERT INTO meetings (conversation_id, participants, scheduled_at, status)
       VALUES (?, ?, ?, 'scheduled')`,
      [conversationId, JSON.stringify(participants), scheduledAt]
    );
    const meetingId = result.insertId;

    // Notify participants and emit socket
    for (const participantId of participants) {
      await db.query(
        `INSERT INTO notifications (sender_id, receiver_id, message, type, is_read)
         VALUES (?, ?, ?, 'meeting', 0)`,
        [
          participants[0], // first = creator
          participantId,
          "📅 A new meeting has been scheduled.",
        ]
      );

      if (emitToUser) {
        emitToUser(participantId, "meetingScheduled", {
          meetingId,
          conversationId,
          scheduledAt,
          participants,
          status: "scheduled",
        });
      }
    }

    // Schedule reminder (5 mins before)
    const reminderTime = new Date(new Date(scheduledAt).getTime() - 5 * 60000);
    if (reminderTime > new Date()) {
      schedule.scheduleJob(reminderTime, async () => {
        console.log(`🔔 Reminder: meeting ${meetingId} is starting soon`);
        for (const participantId of participants) {
          if (emitToUser) {
            emitToUser(participantId, "meetingReminder", {
              meetingId,
              conversationId,
              scheduledAt,
              timeLeft: "5 minutes",
            });
          }
        }
      });
    }

    res.json({
      success: true,
      meetingId,
      message: "Meeting scheduled successfully",
    });
  } catch (err) {
    console.error("❌ Error scheduling meeting:", err);
    res.status(500).json({ error: "Failed to schedule meeting" });
  }
});

// 🟢 Fetch meetings for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { userId } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM meetings
       WHERE JSON_CONTAINS(participants, JSON_ARRAY(?))
       ORDER BY scheduled_at DESC`,
      [userId]
    );

    res.json({ success: true, meetings: rows });
  } catch (err) {
    console.error("❌ Error fetching user meetings:", err);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// 🟢 Fetch a meeting by conversationId (for chat banner)
router.get("/conversation/:conversationId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { conversationId } = req.params;

    const [rows] = await db.query(
      `SELECT * FROM meetings 
       WHERE conversation_id = ? 
       AND status IN ('scheduled', 'pending')
       ORDER BY scheduled_at DESC
       LIMIT 1`,
      [conversationId]
    );

    if (!rows.length) {
      return res.json({ success: true, meeting: null });
    }

    res.json({ success: true, meeting: rows[0] });
  } catch (err) {
    console.error("❌ Error fetching conversation meeting:", err);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

// 🟢 Update meeting status (cancel / complete)
router.post("/update-status", async (req, res) => {
  try {
    const db = req.app.get("db");
    const emitToUser = req.app.get("emitToUser");
    const { meetingId, status, participants } = req.body;

    if (!meetingId || !status) {
      return res.status(400).json({ error: "Missing meetingId or status" });
    }

    await db.query("UPDATE meetings SET status=? WHERE id=?", [
      status,
      meetingId,
    ]);

    // Emit status update to both users
    if (emitToUser && participants?.length) {
      participants.forEach((pId) => {
        emitToUser(pId, "meetingStatusUpdated", { meetingId, status });
      });
    }

    res.json({ success: true, message: "Meeting status updated" });
  } catch (err) {
    console.error("❌ Error updating meeting status:", err);
    res.status(500).json({ error: "Failed to update meeting" });
  }
});

module.exports = router;