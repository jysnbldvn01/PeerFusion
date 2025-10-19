// src/components/chat/ChatWindow.jsx
import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import "../../css/chat.css";

import { socket, identifySocket } from "../../utils/socket";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ChatWindow = ({ conversationId, currentUser }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [joinEnabled, setJoinEnabled] = useState(false);
  const [reminderReceived, setReminderReceived] = useState(false);
  const [sending, setSending] = useState(false); // shows "Sending..." while uploading/sending
  const scrollRef = useRef();
  const firstLoad = useRef(true);
  const enableTimerRef = useRef(null);
  const clearMeetingTimerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Normalize avatar -> absolute URL
  const ensureAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
    return `${window.location.protocol}//${window.location.host}/uploads/${avatar}`;
  };

  // Fetch other user info
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!conversationId || !currentUser?.user_id) {
        setOtherUser(null);
        return;
      }
      try {
        const convRef = doc(db, "conversations", conversationId);
        const convSnap = await getDoc(convRef);
        if (!convSnap.exists()) {
          setOtherUser(null);
          return;
        }
        const data = convSnap.data();
        const otherId = data.participants?.find((p) => String(p) !== String(currentUser.user_id));
        const info = data.userInfo?.[String(otherId)] || {};
        setOtherUser({
          id: otherId,
          username: info.username || `User ${otherId}`,
          avatar: ensureAvatarUrl(info.avatar || ""),
        });
      } catch (err) {
        console.error("Failed to fetch conversation metadata:", err);
        setOtherUser(null);
      }
    };

    fetchOtherUser();
  }, [conversationId, currentUser?.user_id]);

  // Fetch scheduled meeting (for this conversation)
  useEffect(() => {
    const fetchMeetingForConversation = async () => {
      if (!conversationId) {
        setCurrentMeeting(null);
        return;
      }
      try {
        const res = await fetch(`${API}/meeting/conversation/${conversationId}`);
        const data = await res.json();
        if (data.success) {
          setCurrentMeeting(data.meeting || null);
        }
      } catch (err) {
        console.error("Error fetching meeting for conversation:", err);
      }
    };

    fetchMeetingForConversation();
  }, [conversationId]);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId || !currentUser?.user_id) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMessages(msgs);

      // Mark unseen messages (from other user) as seen by currentUser
      // We'll update using arrayUnion to avoid overwriting
      try {
        const unseen = msgs.filter(
          (m) =>
            String(m.senderId) !== String(currentUser.user_id) &&
            !(m.seenBy || []).map(String).includes(String(currentUser.user_id))
        );
        if (unseen.length > 0) {
          for (const m of unseen) {
            const msgRef = doc(db, "conversations", conversationId, "messages", m.id);
            // add current user to seenBy
            await updateDoc(msgRef, {
              seenBy: arrayUnion(currentUser.user_id),
            });
          }
        }
      } catch (e) {
        // non-fatal; log for debugging
        console.warn("Failed to mark some messages as seen:", e);
      }
    });

    return () => unsubscribe();
  }, [conversationId, currentUser?.user_id]);

  // Auto-scroll
  useEffect(() => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;

    if (firstLoad.current) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      firstLoad.current = false;
    } else {
      const isNearBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 150;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [messages]);

  // Socket listeners
  useEffect(() => {
    if (!currentUser?.user_id) return;

    try {
      identifySocket(currentUser.user_id);
    } catch (err) {
      console.warn("Socket identify failed:", err);
    }

    const onMeetingScheduled = (payload) => {
      try {
        if (!payload) return;
        if (String(payload.conversationId) === String(conversationId)) {
          const scheduled_at =
            payload.scheduledAt || payload.scheduled_at || payload.scheduledAtISO || null;
          const meetingObj = {
            id: payload.meetingId || payload.id,
            conversation_id: payload.conversationId,
            participants: payload.participants || [],
            scheduled_at: scheduled_at || payload.scheduled_at,
            status: payload.status || "scheduled",
          };
          setCurrentMeeting(meetingObj);
          setReminderReceived(false);
          setJoinEnabled(false);
          scheduleEnableJoin(meetingObj);
          scheduleMeetingClear(meetingObj);
        }
      } catch (err) {
        console.error("Error processing meetingScheduled payload:", err);
      }
    };

    const onMeetingReminder = (payload) => {
      if (!payload) return;
      if (String(payload.conversationId) === String(conversationId)) {
        setReminderReceived(true);
        setJoinEnabled(true);
      }
    };

    const onMeetingStatusUpdated = (payload) => {
      if (!payload) return;
      if (
        String(payload.conversationId) === String(conversationId) ||
        String(payload.meetingId) === String(currentMeeting?.id)
      ) {
        if (payload.status === "cancelled" || payload.status === "completed") {
          setCurrentMeeting(null);
          setJoinEnabled(false);
          setReminderReceived(false);
          clearEnableTimer();
          clearMeetingTimer();
        }
      }
    };

    socket.on("meetingScheduled", onMeetingScheduled);
    socket.on("meetingReminder", onMeetingReminder);
    socket.on("meetingStatusUpdated", onMeetingStatusUpdated);

    return () => {
      socket.off("meetingScheduled", onMeetingScheduled);
      socket.off("meetingReminder", onMeetingReminder);
      socket.off("meetingStatusUpdated", onMeetingStatusUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.user_id, conversationId, currentMeeting?.id]);

  // Timers
  const clearEnableTimer = () => {
    if (enableTimerRef.current) {
      clearTimeout(enableTimerRef.current);
      enableTimerRef.current = null;
    }
  };

  const clearMeetingTimer = () => {
    if (clearMeetingTimerRef.current) {
      clearTimeout(clearMeetingTimerRef.current);
      clearMeetingTimerRef.current = null;
    }
  };

  const scheduleEnableJoin = (meetingObj) => {
    clearEnableTimer();
    if (!meetingObj?.scheduled_at) return;

    const scheduledMs = new Date(meetingObj.scheduled_at).getTime();
    const enableAt = scheduledMs - 5 * 60 * 1000;
    const now = Date.now();

    if (enableAt <= now && scheduledMs > now) {
      setJoinEnabled(true);
    } else if (enableAt > now) {
      setJoinEnabled(false);
      enableTimerRef.current = setTimeout(() => {
        setJoinEnabled(true);
        enableTimerRef.current = null;
      }, enableAt - now);
    } else {
      setJoinEnabled(false);
    }
  };

  const scheduleMeetingClear = (meetingObj) => {
    clearMeetingTimer();
    if (!meetingObj?.scheduled_at) return;

    const scheduledMs = new Date(meetingObj.scheduled_at).getTime();
    const now = Date.now();

    // Schedule clearing 5 mins after meeting start
    if (scheduledMs > now) {
      const clearAt = scheduledMs + 5 * 60 * 1000;
      clearMeetingTimerRef.current = setTimeout(() => {
        setCurrentMeeting(null);
        setJoinEnabled(false);
        setReminderReceived(false);
      }, clearAt - now);
    } else if (now > scheduledMs + 5 * 60 * 1000) {
      setCurrentMeeting(null);
      setJoinEnabled(false);
      setReminderReceived(false);
    }
  };

  // Watch for meeting updates
  useEffect(() => {
    if (currentMeeting) {
      scheduleEnableJoin(currentMeeting);
      scheduleMeetingClear(currentMeeting);
    } else {
      clearEnableTimer();
      clearMeetingTimer();
      setJoinEnabled(false);
      setReminderReceived(false);
    }

    return () => {
      clearEnableTimer();
      clearMeetingTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMeeting]);

  // Group messages
  const groups = [];
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (groups.length === 0 || String(groups[groups.length - 1].senderId) !== String(m.senderId)) {
      groups.push({ senderId: m.senderId, msgs: [m] });
    } else {
      groups[groups.length - 1].msgs.push(m);
    }
  }

  // Helper: determine fileType by mime or extension
  const determineFileType = (file) => {
    if (!file) return null;
    const mime = file.type || "";
    const name = (file.name || "").toLowerCase();
    if (mime.startsWith("image/") || name.match(/\.(jpg|jpeg|png|gif)$/)) return "image";
    if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (
      mime === "application/msword" ||
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    )
      return "doc";
    return "file";
  };

  // Upload file to Firebase Storage, return { url, fileType }
  const uploadFileToStorage = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const now = Date.now();
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `chat_uploads/${conversationId}/${now}_${safeName}`;
        const sRef = storageRef(storage, path);
        const uploadTask = uploadBytesResumable(sRef, file);

        uploadTask.on(
          "state_changed",
          null,
          (error) => {
            reject(error);
          },
          async () => {
            try {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({ url, fileType: determineFileType(file) });
            } catch (err) {
              reject(err);
            }
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  };

  // Send message (text or file)
  const send = async (file = null) => {
    if (!currentUser?.user_id || !conversationId) return;
    const trimmed = text.trim();

    if (!trimmed && !file) return;

    setSending(true);

    try {
      let fileResult = null;

      if (file) {
        // validate size
        if (file.size > MAX_FILE_SIZE) {
          alert("File too large. Maximum allowed size is 5 MB.");
          setSending(false);
          return;
        }
        // validate type (no videos)
        const ftype = determineFileType(file);
        if (ftype === "file" && !["pdf", "doc"].includes(ftype)) {
          // generic fallback; allow doc/pdf even if mime odd - rely on determineFileType
        }
        // disallow video mime types
        if (file.type.startsWith("video/")) {
          alert("Video files are not allowed.");
          setSending(false);
          return;
        }

        fileResult = await uploadFileToStorage(file);
      }

      const payload = {
        senderId: currentUser.user_id,
        senderName: currentUser.username || "",
        senderAvatar: currentUser.avatar || "",
        content: fileResult ? fileResult.url : trimmed,
        fileType: fileResult ? fileResult.fileType : null,
        createdAt: serverTimestamp(),
        // sender starts as "seen" by themselves
        seenBy: [currentUser.user_id],
      };

      await addDoc(collection(db, "conversations", conversationId, "messages"), payload);

      // update conversation last message
      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        lastMessage:
          fileResult && fileResult.fileType === "image"
            ? "📷 Image"
            : fileResult && (fileResult.fileType === "pdf" || fileResult.fileType === "doc")
            ? "📄 File"
            : payload.content,
        lastMessageTime: serverTimestamp(),
      });

      // reset input
      setText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Failed to send message:", err);
      alert("Failed to send message. Try again.");
    } finally {
      setSending(false);
    }
  };

  const bubblePositionClass = (groupLength, index) => {
    if (groupLength === 1) return "single";
    if (index === 0) return "first";
    if (index === groupLength - 1) return "last";
    return "middle";
  };

  const handleJoin = () => {
    if (!currentMeeting || !otherUser || !currentUser) return;

    const partnerData = {
      id: otherUser.id,
      username: otherUser.username || `User ${otherUser.id}`,
      avatar: otherUser.avatar ? otherUser.avatar.split("/").pop() : "",
    };

    const videocallUrl = `/videocall?partnerId=${partnerData.id}&partnerUsername=${encodeURIComponent(
      partnerData.username
    )}&partnerAvatar=${encodeURIComponent(partnerData.avatar || "")}`;

    const windowFeatures = "width=1000,height=700,noopener,noreferrer";
    window.open(videocallUrl, "_blank", windowFeatures);
  };

  // Helper: check if a message (sent by me) is seen by the other party
  const isSeenByOther = (m) => {
    if (!m || !otherUser) return false;
    return (m.seenBy || []).map(String).includes(String(otherUser.id));
  };

  return (
    <div className="chat-middle">
      {/* Meeting Banner */}
      {currentMeeting && (
        <div className="meeting-banner">
          <div className="meeting-header">
            <span className="meeting-partner">{otherUser?.username || "Partner"}</span>
            <i className="ri-calendar-line calendar-icon" />
          </div>

          <div className="meeting-body">
            <div className="meeting-reminder">
              REMINDER: Session scheduled on{" "}
              {new Date(currentMeeting.scheduled_at).toLocaleDateString()} at{" "}
              {new Date(currentMeeting.scheduled_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className={`join-button ${joinEnabled ? "enabled" : "disabled"}`}
                onClick={handleJoin}
                disabled={!joinEnabled}
                title={
                  joinEnabled
                    ? "Join session"
                    : "Join will be enabled 5 minutes before the session"
                }
              >
                JOIN
              </button>

              {!joinEnabled && (
                <small style={{ color: "#666" }}>
                  {reminderReceived ? "Join will be available shortly" : "Join available 5 minutes before start"}
                </small>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="chat-messages" ref={scrollRef}>
        {groups.map((g, gIdx) => {
          const isMeGroup = String(g.senderId) === String(currentUser?.user_id);
          return g.msgs.map((m, idx) => {
            const posClass = bubblePositionClass(g.msgs.length, idx);
            const isLastInGroup = idx === g.msgs.length - 1;
            const showAvatar = !isMeGroup && isLastInGroup && otherUser?.avatar;
            const timestamp = m.createdAt?.toDate
              ? new Date(m.createdAt.toDate()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "";

            const sentByMe = isMeGroup;
            const lastMessageInAll = (() => {
              // find last message overall that was sent by me
              for (let i = messages.length - 1; i >= 0; i--) {
                if (String(messages[i].senderId) === String(currentUser?.user_id)) {
                  return messages[i].id === m.id;
                }
              }
              return false;
            })();

            return (
              <div key={m.id} className={`chat-row ${isMeGroup ? "sent" : "received"}`}>
                {!isMeGroup ? (
                  showAvatar ? (
                    <img src={otherUser.avatar} alt={otherUser.username} />
                  ) : (
                    <div className="avatar-space" />
                  )
                ) : (
                  <div className="avatar-space" />
                )}

                <div
                  className={`chat-message bubble ${posClass} ${isMeGroup ? "sent" : "received"}`}
                >
                  {/* Render inline image */}
                  {m.fileType === "image" && m.content ? (
                    <img src={m.content} alt="uploaded" className="chat-image" />
                  ) : null}

                  {/* Render PDF or DOC as inline file card */}
                  {m.fileType === "pdf" || m.fileType === "doc" ? (
                    <a
                      href={m.content}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="chat-file-card"
                      style={{ display: "inline-block", textDecoration: "none" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 20 }}>📄</span>
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {m.fileName || "File"}
                          </div>
                          <div style={{ fontSize: 12, color: "#666" }}>{m.fileType?.toUpperCase()}</div>
                        </div>
                      </div>
                    </a>
                  ) : null}

                  {/* Text content (for text messages or fallback) */}
                  {(!m.fileType || m.fileType === null) && <div className="bubble-text">{m.content}</div>}
                  {/* For file messages, if content is a url but no fileType recognized, show link */}
                  {m.fileType === null && m.content && m.content.startsWith("http") ? (
                    <a href={m.content} target="_blank" rel="noopener noreferrer" className="chat-file">
                      Open file
                    </a>
                  ) : null}

                  <span className="timestamp">
                    {timestamp}{" "}
                    {sentByMe ? (lastMessageInAll ? (isSeenByOther(m) ? "✓✓" : "✓") : "") : ""}
                  </span>
                </div>

                {isMeGroup ? <div className="avatar-space" /> : null}
              </div>
            );
          });
        })}
      </div>

      {/* Input */}
<div className="chat-input">
  {/* Hidden File Input */}
  <input
    ref={fileInputRef}
    type="file"
    accept=".jpg,.jpeg,.png,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
    style={{ display: "none" }}
    onChange={(e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Block video uploads
      if (file.type.startsWith("video/")) {
        alert("Video uploads are not allowed.");
        e.target.value = "";
        return;
      }

      // Send immediately (Messenger style)
      send(file);
    }}
  />

  {/* File Upload Icon */}
  <button
    onClick={() => fileInputRef.current?.click()}
    className="file-upload-icon"
    title="Attach file"
    disabled={sending}
  >
    📎
  </button>

  {/* Message Text Input */}
  <input
    value={text}
    onChange={(e) => setText(e.target.value)}
    placeholder="Type a message"
    onKeyDown={(e) => e.key === "Enter" && send()}
    disabled={sending}
  />

  {/* Send Button */}
  <button onClick={() => send()} disabled={sending}>
    {sending ? "Sending..." : "Send"}
  </button>
</div>
</div>
);
};

export default ChatWindow;