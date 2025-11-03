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

// Icon components for ChatWindow
const AttachmentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const FlagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const ChatWindow = ({ conversationId, currentUser, searchTerm, onBackToList, onShowInfo, isMobile }) => {
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [text, setText] = useState("");
  const [otherUser, setOtherUser] = useState(null);
  const [profilesById, setProfilesById] = useState({});
  const [currentMeeting, setCurrentMeeting] = useState(null);
  const [joinEnabled, setJoinEnabled] = useState(false);
  const [reminderReceived, setReminderReceived] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportOffense, setReportOffense] = useState('Harassment');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState(null);
  const [menuMessageId, setMenuMessageId] = useState(null);
  const [menuAbove, setMenuAbove] = useState(false);
  const [canSchedule, setCanSchedule] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [showScheduleTooltip, setShowScheduleTooltip] = useState(false);
  const menuBtnRefs = useRef({});
  const scrollRef = useRef();
  const firstLoad = useRef(true);
  const enableTimerRef = useRef(null);
  const clearMeetingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scheduleButtonRef = useRef(null);
  const isAuthenticated = !!localStorage.getItem('token');

  // Normalize avatar -> absolute URL
  const ensureAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar !== 'string') return null;
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) return avatar;
    const file = avatar.replace(/^\/+/, "");
    const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
    const UPLOADS_BASE = API_BASE.replace(/\/api$/, "") + "/uploads/";
    return `${UPLOADS_BASE}${file}`;
  };

  // Check schedule permissions
  useEffect(() => {
    const checkSchedulePermission = async () => {
      if (!conversationId || !currentUser?.user_id) return;
      
      try {
        const res = await fetch(`${API}/session/can-schedule/${conversationId}/${currentUser.user_id}`);
        const data = await res.json();
        
        if (data.canSchedule !== undefined) {
          setCanSchedule(data.canSchedule);
          setUserRole(data.userRole || '');
        }
      } catch (err) {
        console.error("Error checking schedule permission:", err);
        setCanSchedule(true); // Fallback to allow scheduling
      }
    };

    checkSchedulePermission();
  }, [conversationId, currentUser?.user_id]);

  // Handle schedule button click with tooltip
  const handleScheduleClick = () => {
    if (canSchedule) {
      setShowMeetingModal(true);
    } else {
      setShowScheduleTooltip(true);
      // Hide tooltip after 3 seconds
      setTimeout(() => {
        setShowScheduleTooltip(false);
      }, 3000);
    }
  };

  const openReportMessage = (message) => {
    setReportTarget({ type: 'message', message });
    setReportReason("");
    setReportOffense('Harassment');
    setShowReportModal(true);
  };

  // Load other users' profiles
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
    fetch(`${API_BASE}/profile/others`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(list => {
        const map = {};
        (list || []).forEach(u => {
          if (u && (u.id || u.user_id)) {
            const id = u.id || u.user_id;
            map[String(id)] = u;
          }
        });
        setProfilesById(map);
      })
      .catch(() => {});
  }, []);

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
        const profile = profilesById[String(otherId)] || {};
        const avatarFilename = profile.avatar || info.avatar || "";
        setOtherUser({
          id: otherId,
          username: info.username || profile.username || `User ${otherId}`,
          avatar: ensureAvatarUrl(avatarFilename || ""),
        });
      } catch (err) {
        console.error("Failed to fetch conversation metadata:", err);
        setOtherUser(null);
      }
    };

    fetchOtherUser();
  }, [conversationId, currentUser?.user_id, profilesById]);

  // Fetch scheduled meeting
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

      // Mark unseen messages as seen
      try {
        const unseen = msgs.filter(
          (m) =>
            String(m.senderId) !== String(currentUser.user_id) &&
            !(m.seenBy || []).map(String).includes(String(currentUser.user_id))
        );
        if (unseen.length > 0) {
          for (const m of unseen) {
            const msgRef = doc(db, "conversations", conversationId, "messages", m.id);
            await updateDoc(msgRef, {
              seenBy: arrayUnion(currentUser.user_id),
            });
          }
        }
      } catch (e) {
        console.warn("Failed to mark some messages as seen:", e);
      }
    });

    return () => unsubscribe();
  }, [conversationId, currentUser?.user_id]);

  // Filter messages based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMessages(messages);
    } else {
      const filtered = messages.filter(message =>
        message.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.senderName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredMessages(filtered);
    }
  }, [searchTerm, messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!scrollRef.current) return;
    
    const scrollToBottom = () => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    };

    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [filteredMessages]);

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
  }, [currentMeeting]);

  // Helper: determine fileType by mime or extension
  const determineFileType = (file) => {
    if (!file) return null;
    const mime = file.type || "";
    const name = (file.name || "").toLowerCase();
    if (mime.startsWith("image/") || name.match(/\.(jpg|jpeg|png|gif)$/)) return "image";
    if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (
      mime === "application/msword" ||
      mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".doc") ||
      name.endsWith(".docx")
    )
      return "doc";
    return "file";
  };

  // Upload file to Firebase Storage
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
        if (file.size > MAX_FILE_SIZE) {
          window.pfToast?.error?.("File too large. Maximum allowed size is 5 MB.");
          setSending(false);
          return;
        }

        const ftype = determineFileType(file);
        if (file.type.startsWith("video/")) {
          window.pfToast?.error?.("Video files are not allowed.");
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
        fileName: file?.name || null,
        createdAt: serverTimestamp(),
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
      window.pfToast?.error?.("Failed to send message. Try again.");
    } finally {
      setSending(false);
    }
  };

const handleJoin = () => {
  if (!currentMeeting || !otherUser || !currentUser) return;

  const partnerData = {
    id: otherUser.id,
    username: otherUser.username || `User ${otherUser.id}`,
    avatar: otherUser.avatar ? otherUser.avatar.split("/").pop() : "",
  };

  // Pass conversationId to the video call
  const videocallUrl = `/videocall?partnerId=${partnerData.id}&partnerUsername=${encodeURIComponent(
    partnerData.username
  )}&partnerAvatar=${encodeURIComponent(partnerData.avatar || "")}&conversationId=${conversationId}`;

  const windowFeatures = "width=1000,height=700,noopener,noreferrer";
  window.open(videocallUrl, "_blank", windowFeatures);
};
  // Helper: check if a message is seen by the other party
  const isSeenByOther = (m) => {
    if (!m || !otherUser) return false;
    return (m.seenBy || []).map(String).includes(String(otherUser.id));
  };

  // Schedule meeting function
  const handleScheduleMeeting = async () => {
    if (!meetingDate || !conversationId || !currentUser || !otherUser) {
      window.pfToast?.info?.("Please select a date and time for the meeting.");
      return;
    }

    try {
      const res = await fetch(`${API}/meeting/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversationId,
          participants: [currentUser.user_id, otherUser.id],
          scheduledAt: meetingDate,
        }),
      });

      const data = await res.json();

      if (data.success) {
        window.pfToast?.success?.("Meeting scheduled successfully!");
        setShowMeetingModal(false);
        setMeetingDate("");
      } else {
        window.pfToast?.error?.("Failed to schedule meeting.");
      }
    } catch (err) {
      console.error("Error scheduling meeting:", err);
      window.pfToast?.error?.("Error scheduling meeting. Please try again.");
    }
  };

  // Highlight search terms in message content
  const highlightSearchTerm = (content) => {
    if (!searchTerm.trim() || !content) return content;
    
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return content.split(regex).map((part, index) =>
      regex.test(part) ? (
        <span key={index} className="peerfusion-chat-search-highlight">{part}</span>
      ) : (
        part
      )
    );
  };

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Group filtered messages
  const groups = [];
  for (let i = 0; i < filteredMessages.length; i++) {
    const m = filteredMessages[i];
    if (groups.length === 0 || String(groups[groups.length - 1].senderId) !== String(m.senderId)) {
      groups.push({ senderId: m.senderId, msgs: [m] });
    } else {
      groups[groups.length - 1].msgs.push(m);
    }
  }

  const handleSubmitReport = async () => {
    if (!otherUser?.id || !reportTarget) return;
    try {
      setReportSubmitting(true);
      const token = localStorage.getItem('token');
      let messagePreview = '';
      const msg = reportTarget.message || {};
      if (msg.fileType === 'image') {
        messagePreview = '[Image]';
      } else if (msg.fileType === 'pdf' || msg.fileType === 'doc') {
        messagePreview = `${(msg.fileType || '').toUpperCase()} File: ${msg.fileName || 'File'}`;
      } else {
        messagePreview = (msg.content || '').toString();
      }
      const description = `Message: "${messagePreview}", Reason: ${reportReason}`;
      const payload = {
        reported_user_id: otherUser.id,
        report_type: reportOffense,
        description,
        source: 'chat_message'
      };
      const API_BASE = (process.env.REACT_APP_API_URL || "http://localhost:5000/api").replace(/\/$/, "");
      const res = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.success) {
        window.pfToast?.success?.('Report submitted successfully.');
        setShowReportModal(false);
        setReportTarget(null);
        setReportReason("");
      } else {
        window.pfToast?.error?.(data?.error || 'Failed to submit report');
      }
    } catch (e) {
      console.error('Report submission error:', e);
      window.pfToast?.error?.('Error submitting report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  // Function to detect URLs and make them clickable
  const makeLinksClickable = (text) => {
    if (!text) return text;
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    if (parts.length === 1) {
      return highlightSearchTerm(text);
    }
    
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{
              color: '#0066cc',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {highlightSearchTerm(part)}
          </a>
        );
      }
      return highlightSearchTerm(part);
    });
  };

  return (
    <div className="peerfusion-chat-middle">
      {/* Chat Header with Mobile Controls */}
      <div className="peerfusion-chat-header">
        <div className="peerfusion-chat-partner-info">
          {/* Back button for mobile */}
          {isMobile && (
            <button 
              className="peerfusion-chat-back-button"
              onClick={onBackToList}
              style={{color: 'white', marginRight: '12px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%'}}
            >
              <BackIcon />
            </button>
          )}

          {otherUser?.avatar ? (
            <img
              src={otherUser.avatar}
              alt={otherUser.username}
              className="peerfusion-chat-partner-avatar"
            />
          ) : (
            <div
              className="peerfusion-chat-partner-avatar"
              style={{
                background: "#e8efe5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: "16px",
                fontWeight: "bold",
              }}
            >
              {otherUser?.username?.charAt(0) || "U"}
            </div>
          )}
          <span className="peerfusion-chat-partner-name">
            {otherUser?.username}
            {userRole && (
              <small style={{display: 'block', fontSize: '0.75rem', opacity: 0.7}}>
                {userRole === 'requester' ? 'You requested this session' : 'You accepted this session'}
              </small>
            )}
          </span>
          <span className={isAuthenticated ? 'online-indicator' : 'offline-indicator'} />
        </div>

        <div className="peerfusion-chat-actions">
          <div className="peerfusion-chat-schedule-button-wrapper" ref={scheduleButtonRef}>
            <button
              className={`peerfusion-chat-meeting-btn ${!canSchedule ? 'disabled' : ''}`}
              onClick={handleScheduleClick}
              disabled={!canSchedule}
            >
              <CalendarIcon />
            </button>
            {/* Tooltip for disabled schedule button */}
            {showScheduleTooltip && !canSchedule && (
              <div className="peerfusion-chat-schedule-tooltip">
                Only the person who accepted your session can schedule meetings
              </div>
            )}
          </div>
          {/* Info button for mobile */}
          {isMobile && (
            <button 
              className="peerfusion-chat-info-btn"
              onClick={onShowInfo}
              title="Conversation Info"
            >
              <InfoIcon />
            </button>
          )}
        </div>
      </div>

      {/* Meeting Banner */}
      {currentMeeting && (
        <div className="peerfusion-chat-meeting-banner">
          <div className="peerfusion-chat-meeting-body">
            <div className="peerfusion-chat-meeting-reminder">
              REMINDER: Session scheduled on{" "}
              {new Date(currentMeeting.scheduled_at).toLocaleDateString()} at{" "}
              {new Date(currentMeeting.scheduled_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className={`peerfusion-chat-join-button ${joinEnabled ? "enabled" : ""}`}
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
                <small style={{ color: "rgba(255,255,255,0.8)" }}>
                  {reminderReceived ? "Join will be available shortly" : "Join available 5 minutes before start"}
                </small>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages container */}
      <div className="peerfusion-chat-messages-container">
        <div className="peerfusion-chat-messages" ref={scrollRef}>
          {searchTerm && (
            <div style={{ 
              padding: '0.5rem 1rem', 
              background: '#e8f5e8', 
              borderRadius: '8px', 
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#2d5a27'
            }}>
              Showing {filteredMessages.length} messages matching "{searchTerm}"
            </div>
          )}
          
          {groups.length === 0 ? (
            <div className="peerfusion-chat-empty">
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>💬</div>
              <h3>No messages yet</h3>
              <p>Start the conversation by sending a message!</p>
            </div>
          ) : (
            groups.map((g, gIdx) => {
              const isMeGroup = String(g.senderId) === String(currentUser?.user_id);
              return g.msgs.map((m, idx) => {
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
                  for (let i = messages.length - 1; i >= 0; i--) {
                    if (String(messages[i].senderId) === String(currentUser?.user_id)) {
                      return messages[i].id === m.id;
                    }
                  }
                  return false;
                })();

                return (
                  <div
                    key={m.id}
                    className={`peerfusion-chat-row ${isMeGroup ? "sent" : "received"}`}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() => setHoveredMessageId((prev) => (prev === m.id ? null : prev))}
                  >
                    {!isMeGroup ? (
                      showAvatar ? (
                        <img src={otherUser.avatar} alt={otherUser.username} className="peerfusion-chat-message-avatar" />
                      ) : (
                        <div className="peerfusion-chat-avatar-space" />
                      )
                    ) : (
                      <div className="peerfusion-chat-avatar-space" />
                    )}

                    <div
                      className={`peerfusion-chat-message-bubble ${isMeGroup ? "sent" : "received"}`}
                    >
                      {/* Render inline image */}
                      {m.fileType === "image" && m.content ? (
                        <img src={m.content} alt="uploaded" className="peerfusion-chat-image" />
                      ) : null}

                      {/* Render PDF or DOC as inline file card */}
                      {m.fileType === "pdf" || m.fileType === "doc" ? (
                        <a
                          href={m.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="peerfusion-chat-file-card"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <FileIcon />
                            <div>
                              <div style={{ fontWeight: 600 }}>
                                {m.fileName || "File"}
                              </div>
                              <div style={{ fontSize: 12, color: "#666" }}>{m.fileType?.toUpperCase()}</div>
                            </div>
                          </div>
                        </a>
                      ) : null}

                      {/* Text content with search highlighting and clickable links */}
                      {(!m.fileType || m.fileType === null) && (
                        <div className="peerfusion-chat-bubble-text">
                          {makeLinksClickable(m.content)}
                        </div>
                      )}

                      <span className="peerfusion-chat-timestamp">
                        {timestamp}{" "}
                        {sentByMe ? (lastMessageInAll ? (isSeenByOther(m) ? "✓✓" : "✓") : "") : ""}
                      </span>
                    </div>

                    {/* Flag icon for reporting received messages */}
                    {!sentByMe && (
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginLeft: 4 }}>
                        <button
                          className="peerfusion-chat-message-report-btn"
                          title="Report message"
                          aria-label="Report message"
                          ref={(el) => { if (el) menuBtnRefs.current[m.id] = el; }}
                          onClick={() => {
                            const next = menuMessageId === m.id ? null : m.id;
                            if (next) {
                              const btn = menuBtnRefs.current[m.id];
                              try {
                                const rect = btn?.getBoundingClientRect();
                                const spaceBelow = (window.innerHeight || document.documentElement.clientHeight) - (rect?.bottom || 0);
                                setMenuAbove(spaceBelow < 120);
                              } catch (_) {
                                setMenuAbove(false);
                              }
                            }
                            setMenuMessageId(next);
                          }}
                          style={{
                            display: (hoveredMessageId === m.id) || (menuMessageId === m.id) || (showReportModal && reportTarget?.message?.id === m.id) ? 'inline-flex' : 'none'
                          }}
                        >
                          <FlagIcon />
                        </button>
                        {menuMessageId === m.id && (
                          <div
                            className="peerfusion-chat-message-menu"
                            style={{ 
                              top: menuAbove ? 'auto' : 'calc(100% + 6px)',
                              bottom: menuAbove ? 'calc(100% + 6px)' : 'auto'
                            }}
                          >
                            <button
                              className="peerfusion-chat-message-menu-item"
                              onClick={() => { setMenuMessageId(null); openReportMessage(m); }}
                            >
                              <FlagIcon />
                              Report message
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isMeGroup ? <div className="peerfusion-chat-avatar-space" /> : null}
                  </div>
                );
              });
            })
          )}
        </div>
      </div>

      {/* Input */}
      <div className="peerfusion-chat-input">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;

            if (file.type.startsWith("video/")) {
              alert("Video uploads are not allowed.");
              e.target.value = "";
              return;
            }

            send(file);
          }}
        />

        {/* File Upload Icon */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="peerfusion-chat-file-upload-icon"
          title="Attach file"
          disabled={sending}
        >
          <AttachmentIcon />
        </button>

        {/* Message Text Input */}
        <input
          className="peerfusion-chat-input-field"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type a message..."
          disabled={sending}
        />

        {/* Send Button */}
        <button className="peerfusion-chat-send-btn" onClick={() => send()} disabled={sending || !text.trim()}>
          {sending ? (
            "Sending..."
          ) : (
            <>
              <SendIcon />
              <span>Send</span>
            </>
          )}
        </button>
      </div>

      {/* Report Modal - Updated to match ChatPage design */}
      {showReportModal && (
        <div className="peerfusion-chat-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="peerfusion-chat-modal-content peerfusion-chat-report-modal" onClick={(e) => e.stopPropagation()} style={{position: 'relative'}}>
            <button className="peerfusion-close-modal" onClick={() => setShowReportModal(false)}>
              <CloseIcon />
            </button>
            <div className="peerfusion-chat-modal-header">
              <h3 className="peerfusion-chat-modal-title">
                Report Message
              </h3>
            </div>
            <div className="peerfusion-chat-modal-body">
              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Message Content</label>
                <div className="peerfusion-chat-form-input" style={{minHeight: '60px', maxHeight: '120px', overflowY: 'auto'}}>
                  {reportTarget?.message?.fileType === 'image' ? 
                    '[Image]' : 
                    reportTarget?.message?.fileType === 'pdf' || reportTarget?.message?.fileType === 'doc' ?
                    `${reportTarget?.message?.fileName || 'File'} (${(reportTarget?.message?.fileType || '').toUpperCase()})` :
                    reportTarget?.message?.content || '(no content)'
                  }
                </div>
              </div>

              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Report Type</label>
                <select
                  className="peerfusion-chat-form-input"
                  value={reportOffense}
                  onChange={(e) => setReportOffense(e.target.value)}
                >
                  <option>Harassment</option>
                  <option>Hate Speech</option>
                  <option>Spam</option>
                  <option>Scam or Fraud</option>
                  <option>Sexual Content</option>
                  <option>Violence or Threats</option>
                  <option>Self-harm</option>
                  <option>Other</option>
                </select>
              </div>

              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Reason</label>
                <textarea
                  className="peerfusion-chat-form-textarea"
                  placeholder="Describe why you are reporting this message"
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={4}
                />
                <div className="peerfusion-chat-form-help">
                  Your report will be reviewed by our moderation team.
                </div>
              </div>

              <div className="peerfusion-chat-modal-actions">
                <button
                  onClick={handleSubmitReport}
                  className="peerfusion-chat-primary-btn peerfusion-chat-report-submit-btn"
                  disabled={reportSubmitting || !otherUser?.id || !reportTarget}
                >
                  {reportSubmitting ? (
                    <>
                      <div className="peerfusion-chat-loading-spinner-small"></div>
                      Submitting...
                    </>
                  ) : (
                    'Submit Report'
                  )}
                </button>
                <button onClick={() => setShowReportModal(false)} className="peerfusion-chat-secondary-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Meeting Modal */}
      {showMeetingModal && (
        <div className="peerfusion-chat-modal-overlay">
          <div className="peerfusion-chat-modal-content peerfusion-chat-meeting-modal" style={{position: 'relative'}}>
            <button 
              className="peerfusion-close-modal"
              onClick={() => setShowMeetingModal(false)}
            >
              <CloseIcon />
            </button>
            <div className="peerfusion-chat-modal-header">
              <h3 className="peerfusion-chat-modal-title">Schedule Meeting</h3>
            </div>

            <div className="peerfusion-chat-modal-body">
              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Meeting Date & Time</label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="peerfusion-chat-form-input"
                />
              </div>
              
              <div className="peerfusion-chat-meeting-participants">
                <label className="peerfusion-chat-form-label">Participants</label>
                <div className="peerfusion-chat-participants-list">
                  <div className="peerfusion-chat-participant">
                    {currentUser?.avatar ? (
                      <img 
                        src={ensureAvatarUrl(currentUser.avatar)} 
                        alt={currentUser.username} 
                        className="peerfusion-chat-participant-avatar"
                      />
                    ) : (
                      <div className="peerfusion-chat-participant-avatar-placeholder">
                        {currentUser?.username?.charAt(0)?.toUpperCase() || "Y"}
                      </div>
                    )}
                    <span>You</span>
                  </div>
                  <div className="peerfusion-chat-participant">
                    {otherUser?.avatar ? (
                      <img 
                        src={otherUser.avatar} 
                        alt={otherUser.username} 
                        className="peerfusion-chat-participant-avatar"
                      />
                    ) : (
                      <div className="peerfusion-chat-participant-avatar-placeholder">
                        {otherUser?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span>{otherUser?.username}</span>
                  </div>
                </div>
              </div>

              <div className="peerfusion-chat-modal-actions">
                <button
                  onClick={handleScheduleMeeting}
                  className="peerfusion-chat-primary-btn"
                  disabled={!meetingDate}
                >
                  <CalendarIcon />
                  Schedule Meeting
                </button>
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="peerfusion-chat-secondary-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;