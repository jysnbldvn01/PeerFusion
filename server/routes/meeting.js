const express = require("express");
const router = express.Router();
const schedule = require("node-schedule");

// Schedule a meeting
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
          `SELECT up.user_id, up.username 
          FROM user_profiles up 
          WHERE up.user_id IN (${participants.map(() => '?').join(',')})`,
          participants
        );
        nameRows.forEach(r => { 
          nameMap[String(r.user_id)] = r.username; // Changed to username
        });
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
    console.error("Error scheduling meeting:", err);
    res.status(500).json({ error: "Failed to schedule meeting" });
  }
});

// Fetch meetings for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const db = req.app.get("db");
    const { userId } = req.params;

    console.log("🔍 Fetching meetings for user ID:", userId);
    
    // First, let's manually parse all meetings to debug
    const [allMeetings] = await db.query(
      `SELECT * FROM meetings ORDER BY scheduled_at DESC`
    );
    
    console.log("📊 Total meetings in database:", allMeetings.length);
    
    // Filter meetings that contain the user ID
    const userMeetings = allMeetings.filter(meeting => {
      try {
        let participants;
        if (typeof meeting.participants === 'string') {
          participants = JSON.parse(meeting.participants);
        } else {
          participants = meeting.participants;
        }
        
        // Check if participants array contains the user ID
        // Convert both to numbers for comparison
        const userIdNum = Number(userId);
        return participants.some(p => {
          const participantId = typeof p === 'object' ? p.id : p;
          return Number(participantId) === userIdNum;
        });
      } catch (e) {
        console.error("Error parsing participants for meeting", meeting.id, e);
        return false;
      }
    });
    
    console.log(`📅 Found ${userMeetings.length} meetings for user ${userId}:`, 
      userMeetings.map(m => ({ 
        id: m.id, 
        conversation_id: m.conversation_id,
        scheduled_at: m.scheduled_at,
        status: m.status 
      }))
    );

    // Enrich meetings with participant details
    const enrichedMeetings = await Promise.all(
      userMeetings.map(async (meeting) => {
        let participants;
        try {
          participants = typeof meeting.participants === 'string' 
            ? JSON.parse(meeting.participants) 
            : meeting.participants;
        } catch (e) {
          console.error("Error parsing participants:", e);
          participants = [];
        }

        // Get usernames for all participants
        const participantDetails = [];
        if (participants && participants.length > 0) {
          // Convert all participant IDs to numbers
          const participantIds = participants.map(p => {
            if (typeof p === 'object') return p.id;
            return Number(p);
          }).filter(id => !isNaN(id));
          
          if (participantIds.length > 0) {
            const placeholders = participantIds.map(() => '?').join(',');
            const [userRows] = await db.query(
              `SELECT user_id, username, avatar FROM user_profiles 
               WHERE user_id IN (${placeholders})`,
              participantIds
            );

            // Map user details
            const userMap = {};
            userRows.forEach(row => {
              userMap[row.user_id] = {
                id: row.user_id,
                username: row.username,
                avatar: row.avatar
              };
            });

            // Create array of participant objects
            participantIds.forEach(id => {
              participantDetails.push(
                userMap[id] || { id, username: `User ${id}` }
              );
            });
          }
        }

        return {
          ...meeting,
          participants: participantDetails,
          rawParticipants: participants
        };
      })
    );

    console.log(`✅ Returning ${enrichedMeetings.length} enriched meetings`);
    
    res.json({ 
      success: true, 
      meetings: enrichedMeetings,
      count: enrichedMeetings.length 
    });
  } catch (err) {
    console.error("❌ Error fetching user meetings:", err);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// Fetch a meeting by conversationId (for chat banner)
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
    console.error("Error fetching conversation meeting:", err);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

// Update meeting status (cancel / complete)
router.post("/update-status", async (req, res) => {
  try {
    const db = req.app.get("db");
    const emitToUser = req.app.get("emitToUser");
    const { meetingId, status } = req.body;

    if (!meetingId || !status) {
      return res.status(400).json({ error: "Missing meetingId or status" });
    }

    // First get the meeting details
    const [meetingRows] = await db.query(
      "SELECT * FROM meetings WHERE id = ?",
      [meetingId]
    );

    if (!meetingRows.length) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const meeting = meetingRows[0];
    
    let participants;
    if (typeof meeting.participants === 'string') {
      participants = JSON.parse(meeting.participants);
    } else {
      participants = meeting.participants;
    }

    await db.query("UPDATE meetings SET status=? WHERE id=?", [
      status,
      meetingId,
    ]);

    if (status === 'cancelled') {
      let nameMap = {};
      try {
        const [nameRows] = await db.query(
          `SELECT up.user_id, up.username 
          FROM user_profiles up 
          WHERE up.user_id IN (?, ?)`,
          participants
        );
        nameRows.forEach(r => { 
          nameMap[String(r.user_id)] = r.username;
        });
      } catch (err) {
        console.error("Error fetching user names:", err);
      }

      const scheduledLabel = new Date(meeting.scheduled_at).toLocaleString();

      for (const participantId of participants) {
        const others = participants.filter(p => p !== participantId);
        const otherNames = others.map(id => nameMap[String(id)] || `User ${id}`).join(', ');
        
        const message = otherNames
          ? `Meeting with ${otherNames} at ${scheduledLabel} has been cancelled.`
          : `The meeting scheduled for ${scheduledLabel} has been cancelled.`;

        await db.query(
          `INSERT INTO notifications (sender_id, receiver_id, message, type, is_read)
           VALUES (?, ?, ?, 'meeting_cancelled', 0)`,
          [
            participants[0],
            participantId,
            message,
          ]
        );

        console.log(`📨 Sent cancellation notification to user ${participantId}`);
      }

      if (emitToUser) {
        participants.forEach((pId) => {
          emitToUser(pId, "meetingCancelled", {
            meetingId,
            conversationId: meeting.conversation_id,
            scheduledAt: meeting.scheduled_at,
            participants,
            status: "cancelled",
          });
        });
      }
    }


    if (emitToUser && participants?.length) {
      participants.forEach((pId) => {
        emitToUser(pId, "meetingStatusUpdated", { 
          meetingId, 
          status
        });
      });
    }

    res.json({ success: true, message: "Meeting status updated" });
  } catch (err) {
    console.error("Error updating meeting status:", err);
    res.status(500).json({ error: "Failed to update meeting" });
  }
});

module.exports = router;