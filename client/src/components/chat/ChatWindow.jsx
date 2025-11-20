import React, { useEffect, useState, useRef, useCallback } from "react";
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

const API_BASE_URL = process.env.REACT_APP_API_URL;

const MAX_FILE_SIZE = 5 * 1024 * 1024;

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

const ChatWindow = ({ conversationId, currentUser, searchTerm, onBackToList, onShowInfo, isMobile, onOtherUserResolved, externalProfilesById, initialOtherUser }) => {
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
  const [avatarErrors, setAvatarErrors] = useState(new Set());
  const [showUnsendModal, setShowUnsendModal] = useState(false);
  const [unsendAction, setUnsendAction] = useState(null);
  const [unsendMessage, setUnsendMessage] = useState(null);
  const [showCancelMeetingModal, setShowCancelMeetingModal] = useState(false);
  const [cancellingMeeting, setCancellingMeeting] = useState(false);
  const [tooltipActive, setTooltipActive] = useState(false);
  const menuBtnRefs = useRef({});
  const scrollRef = useRef();
  const enableTimerRef = useRef(null);
  const clearMeetingTimerRef = useRef(null);
  const fileInputRef = useRef(null);
  const scheduleButtonRef = useRef(null);
  const isAuthenticated = !!localStorage.getItem('token');
  
  // Get authentication token safely
  const getAuthToken = () => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return null;
    }
  };

  // Enhanced API request function with proper error handling
  const makeApiRequest = async (url, options = {}) => {
    const token = getAuthToken();
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      
      if (response.status === 401) {
        console.warn('Authentication failed, redirecting to login');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  useEffect(() => {
  const handleDocumentClick = () => {
    if (tooltipActive) {
      setTooltipActive(false);
    }
  };

  if (tooltipActive) {
    document.addEventListener('click', handleDocumentClick);
  }

  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}, [tooltipActive]);

  // Seed otherUser immediately from parent to avoid placeholder-only flash
  useEffect(() => {
    if (initialOtherUser && initialOtherUser.id) {
      const seeded = {
        id: initialOtherUser.id,
        username: initialOtherUser.username,
        avatar: initialOtherUser.avatar ? ensureAvatarUrl(initialOtherUser.avatar) : null,
      };
      setOtherUser(seeded);
      if (typeof onOtherUserResolved === 'function') onOtherUserResolved(seeded);
    }
  }, [initialOtherUser, onOtherUserResolved]);

  // Socket message listener
  useEffect(() => {
    if (!conversationId || !currentUser?.user_id) return;
    
    const handleNewMessage = (message) => {
      if (message.conversationId === conversationId && 
          String(message.senderId) !== String(currentUser.user_id)) {
        window.dispatchEvent(new Event('chatsUpdated'));
      }
    };

    socket.on('receiveMessage', handleNewMessage);

    return () => {
      socket.off('receiveMessage', handleNewMessage);
    };
  }, [conversationId, currentUser?.user_id]);

  // Fix avatar URL handling to prevent mixed content and connection errors
  const ensureAvatarUrl = (avatar) => {
    if (!avatar) return null;
    if (typeof avatar !== 'string') return null;
    
    if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
      return avatar.replace('http://', 'https://');
    }
    
    const file = avatar.replace(/^\/+/, "");
    const baseUrl = API_BASE_URL || window.location.origin;
    const UPLOADS_BASE = baseUrl.replace(/\/api$/, "") + "/uploads/";
    
    return `${UPLOADS_BASE}${file}`;
  };

  // Handle avatar image errors
  const handleAvatarError = (userId) => {
    setAvatarErrors(prev => new Set(prev).add(userId));
  };

  // Check if avatar has previously failed to load
  const hasAvatarError = (userId) => {
    return avatarErrors.has(userId);
  };

  // Check schedule permissions
  useEffect(() => {
    const checkSchedulePermission = async () => {
      if (!conversationId || !currentUser?.user_id) return;
      
      try {
        const data = await makeApiRequest(
          `${API_BASE_URL}/api/session/can-schedule/${conversationId}/${currentUser.user_id}`
        );
        
        if (data.canSchedule !== undefined) {
          setCanSchedule(data.canSchedule);
          setUserRole(data.userRole || '');
        }
      } catch (err) {
        console.error("Error checking schedule permission:", err);
        setCanSchedule(true);
      }
    };

    checkSchedulePermission();
  }, [conversationId, currentUser?.user_id]);

  // Enhanced profile fetching with error handling
  useEffect(() => {
    const fetchProfiles = async () => {
      const token = getAuthToken();
      if (!token) return;
      
      try {
        const list = await makeApiRequest(`${API_BASE_URL}/api/profile/others`);
        const map = {};
        (list || []).forEach(u => {
          if (u && (u.id || u.user_id)) {
            const id = u.id || u.user_id;
            map[String(id)] = u;
          }
        });
        setProfilesById(map);
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
      }
    };

    fetchProfiles();
  }, []);

  // Enhanced other user fetching
  useEffect(() => {
    const fetchOtherUser = async () => {
      if (!conversationId || !currentUser?.user_id) {
        setOtherUser(null);
        if (typeof onOtherUserResolved === 'function') onOtherUserResolved(null);
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
        
        if (!otherId) {
          setOtherUser(null);
          return;
        }
        
        const info = data.userInfo?.[String(otherId)] || {};
        const profile = (externalProfilesById && externalProfilesById[String(otherId)]) || profilesById[String(otherId)] || {};
        const avatarFilename = profile.avatar || info.avatar || "";
        
        const resolved = {
          id: otherId,
          username: info.username || profile.username || `User ${otherId}`,
          avatar: ensureAvatarUrl(avatarFilename || ""),
        };
        
        setOtherUser(resolved);
        if (typeof onOtherUserResolved === 'function') onOtherUserResolved(resolved);
      } catch (err) {
        console.error("Failed to fetch conversation metadata:", err);
        setOtherUser(null);
        if (typeof onOtherUserResolved === 'function') onOtherUserResolved(null);
      }
    };

    fetchOtherUser();
  }, [conversationId, currentUser?.user_id, profilesById, externalProfilesById, onOtherUserResolved]);

  // Enhanced meeting fetch
  useEffect(() => {
    const fetchMeetingForConversation = async () => {
      if (!conversationId) {
        setCurrentMeeting(null);
        return;
      }
      
      try {
        const data = await makeApiRequest(`${API_BASE_URL}/api/meeting/conversation/${conversationId}`);
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
          
          window.dispatchEvent(new Event('chatsUpdated'));
          const user = JSON.parse(localStorage.getItem('user'));
          if (user && user.id) {
            socket.emit('getCounts', { userId: user.id });
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

  const scheduleEnableJoin = useCallback((meetingObj) => {
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
  }, []);

  const scheduleMeetingClear = useCallback((meetingObj) => {
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
  }, []);

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
  }, [currentMeeting, scheduleEnableJoin, scheduleMeetingClear]);

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

  // Enhanced message sending with better error handling
  const send = async (file = null) => {
    if (!currentUser?.user_id || !conversationId) {
      window.pfToast?.error?.("Unable to send message. Please refresh the page.");
      return;
    }
    
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

      const convRef = doc(db, "conversations", conversationId);
      await updateDoc(convRef, {
        lastMessage: fileResult && fileResult.fileType === "image"
          ? "📷 Image"
          : fileResult && (fileResult.fileType === "pdf" || fileResult.fileType === "doc")
          ? "📄 File"
          : payload.content,
        lastMessageTime: serverTimestamp(),
      });

      window.dispatchEvent(new Event('chatsUpdated'));
      setText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Failed to send message:", err);
      window.pfToast?.error?.("Failed to send message. Please check your connection and try again.");
    } finally {
      setSending(false);
    }
  };

  const handleCancelMeeting = async () => {
  if (!currentMeeting || !currentUser) return;
  
  if (userRole === 'requester') {
    window.pfToast?.info?.('Only the person who accepted this session can cancel it.');
    return;
  }
  
  const ok = await window.pfConfirm?.('Cancel this session for both participants?');
  if (!ok) return;
  
  try {
    setCancellingMeeting(true);
    const participants = currentMeeting.participants || [currentUser.user_id, otherUser?.id].filter(Boolean);
    const res = await fetch(`${API_BASE_URL}/api/meeting/update-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meetingId: currentMeeting.id,
        status: 'cancelled',
        participants,
      }),
    });
    const data = await res.json();
    if (data.success) {
      window.pfToast?.success?.('Session cancelled.');
      setCurrentMeeting(null);
      setJoinEnabled(false);
      setReminderReceived(false);
    } else {
      window.pfToast?.error?.(data.error || 'Failed to cancel session.');
    }
  } catch (err) {
    console.error('Error cancelling meeting:', err);
    window.pfToast?.error?.('Error cancelling session. Please try again.');
  } finally {
    setCancellingMeeting(false);
  }
};

  const confirmCancelMeeting = async () => {
    try {
      setCancellingMeeting(true);
      const participants = currentMeeting.participants || [currentUser.user_id, otherUser?.id].filter(Boolean);
      const res = await fetch(`${API_BASE_URL}/api/meeting/update-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: currentMeeting.id,
          status: 'cancelled',
          participants,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.pfToast?.success?.('Session cancelled successfully.');
        setCurrentMeeting(null);
        setJoinEnabled(false);
        setReminderReceived(false);
        setShowCancelMeetingModal(false);
      } else {
        window.pfToast?.error?.(data.error || 'Failed to cancel session.');
      }
    } catch (err) {
      console.error('Error cancelling meeting:', err);
      window.pfToast?.error?.('Error cancelling session. Please try again.');
    } finally {
      setCancellingMeeting(false);
    }
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
      const res = await fetch(`${API_BASE_URL}/api/meeting/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken() && { Authorization: `Bearer ${getAuthToken()}` }),
        },
        body: JSON.stringify({
          conversationId: conversationId,
          participants: [currentUser.user_id, otherUser.id],
          scheduledAt: meetingDate,
        }),
      });

      if (res.status === 401) {
        window.pfToast?.error?.("Please log in again.");
        return;
      }

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

  // Handle schedule button click with tooltip
  const handleScheduleClick = () => {
    if (canSchedule) {
      setShowMeetingModal(true);
    }
  };

const openReportMessage = (message) => {
  if (message.unsentForEveryone) {
    window.pfToast?.info?.('This message has been unsent and cannot be reported.');
    return;
  }
  setReportTarget({ type: 'message', message });
  setReportReason("");
  setReportOffense('Harassment');
  setShowReportModal(true);
};

  // Enhanced report submission
  const handleSubmitReport = async () => {
    if (!otherUser?.id || !reportTarget) return;
    
    try {
      setReportSubmitting(true);
      
      const msg = reportTarget.message || {};
      let messagePreview = '';
      
      if (msg.fileType === 'image') {
        messagePreview = '[Image]';
      } else if (msg.fileType === 'pdf' || msg.fileType === 'doc') {
        messagePreview = `${(msg.fileType || '').toUpperCase()} File: ${msg.fileName || 'File'}`;
      } else {
        messagePreview = (msg.content || '').toString().substring(0, 200);
      }
      
      const description = `Message: "${messagePreview}", Reason: ${reportReason}`;
      const payload = {
        reported_user_id: otherUser.id,
        report_type: reportOffense,
        description,
        source: 'chat_message'
      };
      
      await makeApiRequest(`${API_BASE_URL}/api/reports`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      window.pfToast?.success?.('Report submitted successfully.');
      setShowReportModal(false);
      setReportTarget(null);
      setReportReason("");
    } catch (e) {
      console.error('Report submission error:', e);
      window.pfToast?.error?.('Error submitting report. Please try again.');
    } finally {
      setReportSubmitting(false);
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

  // Render avatar with error handling
  const renderAvatar = (user, className = "peerfusion-chat-partner-avatar", size = 'medium') => {
    const userId = user?.id;
    const shouldShowAvatar = user?.avatar && !hasAvatarError(userId);
    const fontSize = size === 'small' ? '12px' : '16px';
    
    return (
      <div 
        className={className} 
        style={{ 
          position: 'relative', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: '#e8efe5', 
          color: '#666', 
          fontSize: fontSize, 
          fontWeight: 'bold' 
        }}
      >
        {user?.username?.charAt(0) || 'U'}
        {shouldShowAvatar && (
          <img
            src={ensureAvatarUrl(user.avatar)}
            alt={user.username}
            style={{ 
              position: 'absolute', 
              inset: 0, 
              width: '100%', 
              height: '100%', 
              borderRadius: '50%' 
            }}
            onError={() => handleAvatarError(userId)}
            loading="lazy"
          />
        )}
      </div>
    );
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

const handleUnsendForYou = async (message) => {
  if (!conversationId || !currentUser?.user_id || !message?.id) return;
  
  const ok = await window.pfConfirm?.('Remove this message for you?');
  if (!ok) return;
  
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", message.id);
    await updateDoc(msgRef, {
      hiddenFor: arrayUnion(currentUser.user_id),
    });
    window.pfToast?.success?.('Message removed.');
  } catch (err) {
    console.error("Failed to remove message:", err);
    window.pfToast?.error?.("Failed to remove message. Please try again.");
  } finally {
    setMenuMessageId(null);
  }
};


const handleUnsendForEveryone = async (message) => {
  if (!conversationId || !currentUser?.user_id || !message?.id) return;

  if (String(message.senderId) !== String(currentUser.user_id)) {
    return;
  }
  
  const ok = await window.pfConfirm?.('Unsend this message for everyone?');
  if (!ok) return;
  
  try {
    const msgRef = doc(db, "conversations", conversationId, "messages", message.id);
    await updateDoc(msgRef, {
      unsentForEveryone: true,
      unsentByName: message.senderName || currentUser.username || "Someone",
    });
    window.pfToast?.success?.('Message unsent.');
  } catch (err) {
    console.error("Failed to unsend message:", err);
    window.pfToast?.error?.("Failed to unsend message. Please try again.");
  } finally {
    setMenuMessageId(null);
  }
};
  
    const confirmUnsend = async () => {
    if (!unsendMessage || !unsendAction) return;
    
    try {
      const msgRef = doc(db, "conversations", conversationId, "messages", unsendMessage.id);
      
      if (unsendAction === 'forMe') {
        await updateDoc(msgRef, {
          hiddenFor: arrayUnion(currentUser.user_id),
        });
        window.pfToast?.success?.('Message unsent for you.');
      } else if (unsendAction === 'forEveryone') {
        await updateDoc(msgRef, {
          unsentForEveryone: true,
          unsentByName: unsendMessage.senderName || currentUser.username || "Someone",
        });
        window.pfToast?.success?.('Message unsent for everyone.');
      }
    } catch (err) {
      console.error("Failed to unsend message:", err);
      window.pfToast?.error?.(`Failed to unsend message. Please try again.`);
    } finally {
      setShowUnsendModal(false);
      setUnsendMessage(null);
      setUnsendAction(null);
      setMenuMessageId(null);
    }
  };
  return (
    <div className="peerfusion-chat-middle">
      {/* Chat Header */}
      <div className="peerfusion-chat-header">
        <div className="peerfusion-chat-partner-info">
          {isMobile && (
            <button 
              className="peerfusion-chat-back-button"
              onClick={onBackToList}
              style={{color: 'white', marginRight: '12px', background: 'rgba(255,255,255,0.2)', padding: '8px', borderRadius: '50%'}}
            >
              <BackIcon />
            </button>
          )}

          {renderAvatar(otherUser, "peerfusion-chat-partner-avatar")}
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
          <div 
              className={`peerfusion-chat-schedule-button-wrapper ${tooltipActive ? 'tooltip-active' : ''}`}
              ref={scheduleButtonRef}
              onClick={(e) => {
                if (!canSchedule && isMobile) {
                  e.stopPropagation();
                  setTooltipActive(!tooltipActive);
                }
              }}
            >
            <button
              className={`peerfusion-chat-meeting-btn ${!canSchedule ? 'disabled' : ''}`}
              onClick={handleScheduleClick}
              disabled={!canSchedule}
            >
              <CalendarIcon />
            </button>
            
            {/* Permanent tooltip that shows on hover/touch for disabled schedule button */}
            {!canSchedule && (
              <div className="peerfusion-chat-schedule-tooltip peerfusion-chat-schedule-tooltip-permanent">
                <div className="peerfusion-chat-tooltip-arrow"></div>
                Only the person who accepted your session can schedule meetings
              </div>
            )}
          </div>
          
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

              {userRole !== 'requester' && (
                <button
                  className="peerfusion-chat-join-button peerfusion-chat-cancel-button"
                  onClick={handleCancelMeeting}
                  disabled={cancellingMeeting}
                  title="Cancel this session for both participants"
                >
                  {cancellingMeeting ? 'Cancelling...' : 'Cancel Session'}
                </button>
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
                if ((m.hiddenFor || []).map(String).includes(String(currentUser?.user_id))) {
                  return null;
                }
                const isLastInGroup = idx === g.msgs.length - 1;
                const showTailAvatar = !isMeGroup && isLastInGroup;

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
                const actionsMenu = (
                  <div style={{ display: 'flex', alignItems: 'center', position: 'relative', marginLeft: sentByMe ? 0 : 4, marginRight: sentByMe ? 4 : 0 }}>
                      <button
                        className="peerfusion-chat-message-report-btn"
                        title="Message actions"
                        aria-label="Message actions"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuMessageId(menuMessageId === m.id ? null : m.id);
                        }}
                        style={{
                          display: isMobile || (hoveredMessageId === m.id) || (menuMessageId === m.id) ? 'inline-flex' : 'none'
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: 1 }}>⋯</span>
                      </button>
                      {menuMessageId === m.id && (
                        <div className="peerfusion-chat-message-menu">
                          {/* Menu items remain the same */}
                          {sentByMe && !m.unsentForEveryone && (
                            <button className="peerfusion-chat-message-menu-item" onClick={() => handleUnsendForEveryone(m)}>
                              Unsend for everyone
                            </button>
                          )}
                          <button className="peerfusion-chat-message-menu-item" onClick={() => handleUnsendForYou(m)}>
                            Remove for you
                          </button>
                          {!sentByMe && !m.unsentForEveryone && (
                            <button className="peerfusion-chat-message-menu-item" onClick={() => { setMenuMessageId(null); openReportMessage(m); }}>
                              <FlagIcon />
                              Report
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                );
                return (
                  <div
                    key={m.id}
                    className={`peerfusion-chat-row ${isMeGroup ? "sent" : "received"}`}
                    onMouseEnter={() => setHoveredMessageId(m.id)}
                    onMouseLeave={() => setHoveredMessageId((prev) => (prev === m.id ? null : prev))}
                  >
                    {!isMeGroup ? (
                      showTailAvatar ? (
                        otherUser?.avatar ? (
                          <img 
                            src={ensureAvatarUrl(otherUser.avatar)} 
                            alt={otherUser.username} 
                            className="peerfusion-chat-message-avatar" 
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div 
                            className="peerfusion-chat-message-avatar"
                            style={{
                              background: '#e8efe5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#666',
                              fontSize: '12px',
                              fontWeight: 700,
                              textTransform: 'uppercase'
                            }}
                          >
                            {otherUser?.username?.charAt(0) || 'U'}
                          </div>
                        )
                      ) : (
                        <div className="peerfusion-chat-avatar-space" />
                      )
                    ) : (
                      <div className="peerfusion-chat-avatar-space" />
                    )}

                    {sentByMe && actionsMenu}

                    <div
                      className={`peerfusion-chat-message-bubble ${isMeGroup ? "sent" : "received"}`}
                    >
                      {m.unsentForEveryone ? (
                        <div className="peerfusion-chat-bubble-text" style={{ fontStyle: 'italic', opacity: 0.8 }}>
                          {(m.unsentByName || m.senderName || 'Someone')} unsent a message
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                      <span className="peerfusion-chat-timestamp">
                        {timestamp}{" "}
                        {sentByMe ? (lastMessageInAll ? (isSeenByOther(m) ? "✓✓" : "✓") : "") : ""}
                      </span>
                    </div>

                    {!sentByMe && actionsMenu}
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

      {/* Cancel Meeting Confirmation Modal */}
      {showCancelMeetingModal && (
        <div className="peerfusion-chat-modal-overlay" onClick={() => setShowCancelMeetingModal(false)}>
          <div className="peerfusion-chat-modal-content peerfusion-chat-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="peerfusion-close-modal" onClick={() => setShowCancelMeetingModal(false)}>
              <CloseIcon />
            </button>
            
            <div className="peerfusion-chat-modal-header">
              <div className="peerfusion-chat-warning-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#e74c3c">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h3 className="peerfusion-chat-modal-title">Cancel Session</h3>
            </div>

            <div className="peerfusion-chat-modal-body">
              <div className="peerfusion-chat-confirm-message">
                <p>Are you sure you want to cancel this session?</p>
                <div className="peerfusion-chat-meeting-details">
                  <strong>Session Time:</strong><br />
                  {currentMeeting && new Date(currentMeeting.scheduled_at).toLocaleString()}
                </div>
                <div className="peerfusion-chat-warning-note">
                  This action cannot be undone. Both participants will be notified.
                </div>
              </div>

              <div className="peerfusion-chat-modal-actions">
                <button
                  onClick={confirmCancelMeeting}
                  className="peerfusion-chat-danger-btn"
                  disabled={cancellingMeeting}
                >
                  {cancellingMeeting ? (
                    <>
                      <div className="peerfusion-chat-loading-spinner-small"></div>
                      Cancelling...
                    </>
                  ) : (
                    'Yes, Cancel Session'
                  )}
                </button>
                <button 
                  onClick={() => setShowCancelMeetingModal(false)}
                  className="peerfusion-chat-secondary-btn"
                  disabled={cancellingMeeting}
                >
                  Keep Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsend Confirmation Modal */}
      {showUnsendModal && (
        <div className="peerfusion-chat-modal-overlay" onClick={() => setShowUnsendModal(false)}>
          <div className="peerfusion-chat-modal-content peerfusion-chat-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <button className="peerfusion-close-modal" onClick={() => setShowUnsendModal(false)}>
              <CloseIcon />
            </button>
            
            <div className="peerfusion-chat-modal-header">
              <div className="peerfusion-chat-warning-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="#f39c12">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <h3 className="peerfusion-chat-modal-title">
                {unsendAction === 'forMe' ? 'Unsend for Yourself' : 'Unsend for Everyone'}
              </h3>
            </div>

            <div className="peerfusion-chat-modal-body">
              <div className="peerfusion-chat-confirm-message">
                {unsendAction === 'forMe' ? (
                  <>
                    <p>This message will be removed from your view only.</p>
                    <div className="peerfusion-chat-message-preview">
                      <strong>Message:</strong>
                      <div className="peerfusion-chat-preview-content">
                        {unsendMessage?.fileType === 'image' ? 
                          '[Image]' : 
                          unsendMessage?.fileType === 'pdf' || unsendMessage?.fileType === 'doc' ?
                          `${unsendMessage?.fileName || 'File'} (${(unsendMessage?.fileType || '').toUpperCase()})` :
                          unsendMessage?.content?.substring(0, 100) || '(no content)'
                        }
                      </div>
                    </div>
                    <div className="peerfusion-chat-info-note">
                      The other person will still be able to see this message.
                    </div>
                  </>
                ) : (
                  <>
                    <p>This message will be removed for both you and the other person.</p>
                    <div className="peerfusion-chat-message-preview">
                      <strong>Message:</strong>
                      <div className="peerfusion-chat-preview-content">
                        {unsendMessage?.fileType === 'image' ? 
                          '[Image]' : 
                          unsendMessage?.fileType === 'pdf' || unsendMessage?.fileType === 'doc' ?
                          `${unsendMessage?.fileName || 'File'} (${(unsendMessage?.fileType || '').toUpperCase()})` :
                          unsendMessage?.content?.substring(0, 100) || '(no content)'
                        }
                      </div>
                    </div>
                    <div className="peerfusion-chat-warning-note">
                      This action cannot be undone. The message will be replaced with "<em>This message was unsent</em>" for both participants.
                    </div>
                  </>
                )}
              </div>

              <div className="peerfusion-chat-modal-actions">
                <button
                  onClick={confirmUnsend}
                  className="peerfusion-chat-warning-btn"
                >
                  {unsendAction === 'forMe' ? 'Unsend for Me' : 'Unsend for Everyone'}
                </button>
                <button 
                  onClick={() => setShowUnsendModal(false)}
                  className="peerfusion-chat-secondary-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        {/* Report Modal */}
        {showReportModal && (
          <div className="peerfusion-chat-modal-overlay" onClick={() => setShowReportModal(false)}>
            <div className="peerfusion-chat-modal-content peerfusion-chat-report-modal" onClick={(e) => e.stopPropagation()}>
              <button className="peerfusion-close-modal" onClick={() => setShowReportModal(false)}>
                <CloseIcon />
              </button>
              <div className="peerfusion-chat-modal-header">
                <h3 className="peerfusion-chat-modal-title">
                  Report Message
                </h3>
              </div>
              <div className="peerfusion-chat-modal-body">
                {/* Only show message content if it's not unsent */}
                {!reportTarget?.message?.unsentForEveryone ? (
                  <div className="peerfusion-chat-form-group">
                    <label className="peerfusion-chat-form-label">Message Content</label>
                    <div className="peerfusion-chat-form-input peerfusion-chat-report-message-preview">
                      {reportTarget?.message?.fileType === 'image' ? 
                        '[Image]' : 
                        reportTarget?.message?.fileType === 'pdf' || reportTarget?.message?.fileType === 'doc' ?
                        `${reportTarget?.message?.fileName || 'File'} (${(reportTarget?.message?.fileType || '').toUpperCase()})` :
                        reportTarget?.message?.content || '(no content)'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="peerfusion-chat-form-group">
                    <div className="peerfusion-chat-report-unsent-notice">
                      <InfoIcon />
                      <span>This message has been unsent by the sender.</span>
                    </div>
                  </div>
                )}

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
                        onError={(e) => { e.target.style.display = 'none'; }}
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
                        src={ensureAvatarUrl(otherUser.avatar)} 
                        alt={otherUser.username} 
                        className="peerfusion-chat-participant-avatar"
                        onError={(e) => { e.target.style.display = 'none'; }}
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