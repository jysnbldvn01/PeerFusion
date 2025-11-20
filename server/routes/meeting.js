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

    // Build name map for participants to personalize notifications
    let nameMap = {};
    try {
      const [nameRows] = await db.query(
        `SELECT id, name FROM users WHERE id IN (${participants.map(() => '?').join(',')})`,
        participants
      );
      nameRows.forEach(r => { nameMap[String(r.id)] = r.name; });
    } catch (_) {}

    const scheduledLabel = new Date(scheduledAt).toLocaleString();

    // Notify participants and emit socket
    for (const participantId of participants) {
      const others = participants.filter(p => p !== participantId);
      const otherNames = others.map(id => nameMap[String(id)] || `User ${id}`).join(', ');
      const message = otherNames
        ? `📅 Meeting with ${otherNames} at ${scheduledLabel} has been scheduled.`
        : `📅 A new meeting has been scheduled for ${scheduledLabel}.`;

      await db.query(
        `INSERT INTO notifications (sender_id, receiver_id, message, type, is_read)
         VALUES (?, ?, ?, 'meeting', 0)`,
        [
          participants[0], // first = creator
          participantId,
          message,
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

    // Schedule reminder (15 mins before)
    const reminderTime = new Date(new Date(scheduledAt).getTime() - 15 * 60000);
    if (reminderTime > new Date()) {
      schedule.scheduleJob(reminderTime, async () => {
        console.log(`🔔 Reminder: meeting ${meetingId} starts in 15 minutes`);
        for (const participantId of participants) {
          // Insert a notification record for each participant (copying style used above)
          try {
            await db.query(
              `INSERT INTO notifications (sender_id, receiver_id, message, type, is_read)
               VALUES (?, ?, ?, 'meeting_reminder', 0)`,
              [
                participants[0], // creator as sender
                participantId,
                "⏰ Your meeting starts in 15 minutes.",
              ]
            );
          } catch (_) {}

          if (emitToUser) {
            emitToUser(participantId, "meetingReminder", {
              meetingId,
              conversationId,
              scheduledAt,
              timeLeft: "15 minutes",
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