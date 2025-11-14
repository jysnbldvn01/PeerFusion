import React, { useState, useEffect, useRef, useContext } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion,
  addDoc,
  serverTimestamp 
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import { AuthContext } from "../../context/AuthContext";
import { useLocation } from "react-router-dom";
const API_BASE_URL = process.env.REACT_APP_API_URL;

// Icon components
const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const BackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

const AttachmentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
  </svg>
);

const InfoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const FloatingChatToggle = () => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeConversation, setActiveConversation] = useState(null);
  const [view, setView] = useState('list');
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [mediaItems, setMediaItems] = useState([]);
  const [fileItems, setFileItems] = useState([]);
  const [conversationUnreadCounts, setConversationUnreadCounts] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [profilesById, setProfilesById] = useState({});  

  const chatRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Track already notified message IDs to prevent duplicates
  const notifiedMessageIds = useRef(new Set());

  // Disable toggle when on chat page
  const isChatPage = location.pathname === '/chat';

  // Build absolute avatar URL from filename or absolute URL
  const ensureAvatarUrl = (avatar) => {
    if (!avatar || typeof avatar !== 'string') return null;
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) return avatar;
    const file = avatar.replace(/^\/+/, '');
    const UPLOADS_BASE = API_BASE_URL + '/uploads/';
    return `${UPLOADS_BASE}${file}`;
  };

  // Load other user profiles (to get avatar filenames stored on server)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE_URL}/api/profile/others`, { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then((res) => res.json())
      .then((list) => {
        const map = {};
        (list || []).forEach((u) => {
          const id = u?.id || u?.user_id;
          if (id) map[String(id)] = u;
        });
        setProfilesById(map);
      })
      .catch(() => {});
  }, [location.pathname]);

  // Real-time unread count calculation
  useEffect(() => {
    if (!user?.user_id) return;

    // Listen to all conversations where user is a participant
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", Number(user.user_id)),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribeConversations = onSnapshot(q, (snapshot) => {
      const convos = snapshot.docs.map((doc) => {
        const data = doc.data();
        const otherId = data.participants.find((p) => Number(p) !== Number(user.user_id));
        const otherUser = data.userInfo?.[String(otherId)] || {};
        const profile = profilesById[String(otherId)] || {};
        const avatarFilename = profile.avatar || otherUser.avatar || '';

        return {
          id: doc.id,
          ...data,
          otherUser: {
            id: otherId,
            username: otherUser.username || `User ${otherId}`,
            avatar: ensureAvatarUrl(avatarFilename) || null,
          },
          lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
        };
      });
      
      setConversations(convos);
    });

    return () => unsubscribeConversations();
  }, [user?.user_id, profilesById]);

  // Real-time unread message tracking and notification system
  useEffect(() => {
    if (!user?.user_id) return;

    const unsubscribeCallbacks = [];
    const newUnreadCounts = {};

    // Subscribe to messages for each conversation to track unread counts
    conversations.forEach((conversation) => {
      const messagesQuery = query(
        collection(db, "conversations", conversation.id, "messages"),
        orderBy("createdAt", "desc")
      );

      const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
        let unread = 0;
        let latestNewMessage = null;
        
        messagesSnapshot.docs.forEach((messageDoc) => {
          const message = messageDoc.data();
          const messageId = messageDoc.id;
          
          // Check if message is from other user and not seen by current user
          if (String(message.senderId) !== String(user.user_id)) {
            const seenBy = message.seenBy || [];
            if (!seenBy.map(String).includes(String(user.user_id))) {
              unread++;
              
              // Check if this is a new message we haven't notified about
              if (!notifiedMessageIds.current.has(messageId)) {
                latestNewMessage = {
                  ...message,
                  id: messageId,
                  conversationId: conversation.id,
                  conversation: conversation
                };
                // Mark this message as notified
                notifiedMessageIds.current.add(messageId);
              }
            }
          }
        });

        // Update the unread count for this conversation
        newUnreadCounts[conversation.id] = unread;
        
        // Update state with the new counts
        setConversationUnreadCounts(prev => ({
          ...prev,
          [conversation.id]: unread
        }));

        // Calculate total unread count
        const totalUnread = Object.values(newUnreadCounts).reduce((sum, count) => sum + count, 0);
        setUnreadCount(totalUnread);

        // Show notification for the latest new message (only once)
        if (latestNewMessage && !isOpen && !isChatPage) {
          showNotification(latestNewMessage, conversation);
        }
      });

      unsubscribeCallbacks.push(unsubscribeMessages);
    });

    // Cleanup function
    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, [conversations, user?.user_id, isOpen, isChatPage]);

  // Show notification function
  const showNotification = (message, conversation) => {
    const notificationId = Date.now().toString();
    const newNotification = {
      id: notificationId,
      senderName: message.senderName || conversation.otherUser.username,
      senderAvatar: ensureAvatarUrl(message.senderAvatar || conversation.otherUser.avatar) || undefined,
      message: message.content,
      conversationId: conversation.id,
      conversation: conversation,
      timestamp: new Date(),
      messageId: message.id // Store the message ID to prevent duplicates
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after 10 seconds
    setTimeout(() => {
      removeNotification(notificationId);
    }, 10000);
  };

  // Remove notification
  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  // Handle notification click
  const handleNotificationClick = (notification) => {
    // Open the chat toggle
    setIsOpen(true);
    // Set the active conversation
    setActiveConversation(notification.conversation);
    setView('chat');
    // Remove the notification
    removeNotification(notification.id);
  };

  // Clear notified messages when component unmounts or user changes
  useEffect(() => {
    return () => {
      notifiedMessageIds.current.clear();
    };
  }, [user?.user_id]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversation?.id || !user?.user_id) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, "conversations", activeConversation.id, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map((d) => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date()
      }));
      setMessages(msgs);

      // Mark messages as read when viewing conversation
      const unseen = msgs.filter(
        (m) =>
          String(m.senderId) !== String(user.user_id) &&
          !(m.seenBy || []).map(String).includes(String(user.user_id))
      );

      if (unseen.length > 0) {
        const updatePromises = unseen.map(async (m) => {
          const msgRef = doc(db, "conversations", activeConversation.id, "messages", m.id);
          await updateDoc(msgRef, {
            seenBy: arrayUnion(user.user_id),
          });
        });

        await Promise.all(updatePromises);
        
        // Immediately update local state to reflect read status
        setConversationUnreadCounts(prev => ({
          ...prev,
          [activeConversation.id]: 0
        }));
        
        // Recalculate total unread count
        const newTotal = Object.values(conversationUnreadCounts)
          .filter((_, convId) => convId !== activeConversation.id)
          .reduce((sum, count) => sum + count, 0);
        setUnreadCount(newTotal);
      }
    });

    return () => unsubscribe();
  }, [activeConversation?.id, user?.user_id, conversationUnreadCounts]);

  // Fetch media and files for info panel
  useEffect(() => {
    if (!activeConversation?.id || view !== 'info') {
      setMediaItems([]);
      setFileItems([]);
      return;
    }

    const q = query(
      collection(db, "conversations", activeConversation.id, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const images = [];
      const files = [];

      snapshot.docs.forEach((d) => {
        const m = { id: d.id, ...d.data() };
        const ft = (m.fileType || "").toString().toLowerCase();

        if (ft === "image" && m.content) {
          images.push({
            id: m.id,
            url: m.content,
            fileType: ft,
            fileName: m.fileName || null,
            createdAt: m.createdAt,
          });
        } else if (["pdf", "doc"].includes(ft) && m.content) {
          files.push({
            id: m.id,
            url: m.content,
            fileType: ft,
            fileName: m.fileName || m.content.split("/").pop(),
            createdAt: m.createdAt,
          });
        }
      });

      setMediaItems(images);
      setFileItems(files);
    });

    return () => unsubscribe();
  }, [activeConversation?.id, view]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (chatRef.current && !chatRef.current.contains(event.target)) {
        setIsOpen(false);
        setView('list');
        setActiveConversation(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Navigation handlers
  const handleConversationSelect = async (conversation) => {
    setActiveConversation(conversation);
    setView('chat');
    setNewMessage('');
  };

  const handleBackToList = () => {
    setActiveConversation(null);
    setView('list');
    setMessages([]);
  };

  const handleShowInfo = () => {
    setView('info');
  };

  const handleBackToChat = () => {
    setView('chat');
  };

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

  const uploadFileToStorage = (file) => {
    return new Promise((resolve, reject) => {
      try {
        const now = Date.now();
        const safeName = file.name.replace(/\s+/g, "_");
        const path = `chat_uploads/${activeConversation.id}/${now}_${safeName}`;
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

  const sendMessage = async (file = null) => {
    if (!newMessage.trim() && !file) return;
    if (!activeConversation?.id || !user || sending) return;

    setSending(true);
    try {
      let fileResult = null;

      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          alert("File too large. Maximum allowed size is 5 MB.");
          setSending(false);
          return;
        }

        const ftype = determineFileType(file);
        if (file.type.startsWith("video/")) {
          alert("Video files are not allowed.");
          setSending(false);
          return;
        }

        fileResult = await uploadFileToStorage(file);
      }

      const payload = {
        senderId: user.user_id,
        senderName: user.username || "",
        content: fileResult ? fileResult.url : newMessage.trim(),
        fileType: fileResult ? fileResult.fileType : null,
        fileName: file?.name || null,
        createdAt: serverTimestamp(),
        seenBy: [user.user_id],
      };

      await addDoc(collection(db, "conversations", activeConversation.id, "messages"), payload);

      // Update conversation last message
      const convRef = doc(db, "conversations", activeConversation.id);
      await updateDoc(convRef, {
        lastMessage: fileResult ? "📎 File" : newMessage.trim(),
        lastMessageTime: serverTimestamp(),
      });

      setNewMessage('');
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInHours = (now - messageTime) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return messageTime.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatNotificationTime = (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = (now - notificationTime) / (1000 * 60);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime.toLocaleDateString();
  };

  const toggleChat = () => {
    if (isChatPage) return;
    setIsOpen(!isOpen);
    if (!isOpen) {
      setView('list');
      setActiveConversation(null);
      setMessages([]);
    }
  };

  if (!user || isChatPage) return null;

  return (
    <>
      {/* Floating Chat Toggle Button */}
      <div className={`peerfusion-floating-chat-toggle ${isOpen ? 'active' : ''} ${isChatPage ? 'disabled' : ''}`} onClick={toggleChat}>
        <ChatIcon />
        {unreadCount > 0 && (
          <span className="peerfusion-floating-unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </div>

        {/* Notifications Container */}
        <div className="peerfusion-chat-notifications-container">
        {notifications.map((notification) => (
            <div 
            key={notification.id} 
            className="peerfusion-chat-notification"
            onClick={() => handleNotificationClick(notification)}
            >
            <div className="peerfusion-chat-notification-content">
                <div className="peerfusion-chat-notification-header">
                <div className="peerfusion-chat-notification-profile">
                    <img 
                    src={notification.senderAvatar} 
                    alt={notification.senderName}
                    className="peerfusion-chat-notification-avatar"
                    onError={(e) => {
                        e.target.src = "/default-avatar.png";
                    }}
                    />
                    <span className="peerfusion-chat-notification-name">
                    {notification.senderName}
                    </span>
                </div>
                
                {/* Time positioned top right */}
                <div className="peerfusion-chat-notification-time">
                    {formatNotificationTime(notification.timestamp)}
                </div>
                
                {/* Close button positioned top right */}
                <button 
                    className="peerfusion-chat-notification-close"
                    onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                    }}
                >
                    <CloseIcon />
                </button>
                </div>
                
                {/* Separator line */}
                <div className="peerfusion-chat-notification-separator"></div>
                
                {/* Clean plain message */}
                <div className="peerfusion-chat-notification-message">
                {notification.message.length > 120 
                    ? `${notification.message.substring(0, 120)}...` 
                    : notification.message
                }
                </div>
            </div>
            
            {/* Time limit progress bar */}
            <div className="peerfusion-chat-notification-progress">
                <div className="peerfusion-chat-notification-progress-bar"></div>
            </div>
            </div>
        ))}
        </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="peerfusion-floating-chat-panel" ref={chatRef}>
          {/* Header */}
          <div className="peerfusion-floating-chat-header">
            {view === 'chat' ? (
              <div className="peerfusion-floating-chat-header-with-back">
                <button className="peerfusion-back-button" onClick={handleBackToList}>
                  <BackIcon />
                </button>
                <div className="peerfusion-floating-chat-partner">
                  <img 
                    src={ensureAvatarUrl(activeConversation?.otherUser?.avatar) || '/default-avatar.png'} 
                    alt={activeConversation?.otherUser?.username}
                    className="peerfusion-floating-avatar"
                    onError={(e) => {
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                  <span className="peerfusion-floating-partner-name">
                    {activeConversation?.otherUser?.username}
                  </span>
                </div>
                <div className="peerfusion-floating-chat-actions">
                  <button
                    className="peerfusion-info-btn"
                    onClick={handleShowInfo}
                    title="Conversation Info"
                  >
                    <InfoIcon />
                  </button>
                  <button 
                    className="peerfusion-close-button"
                    onClick={() => setIsOpen(false)}
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
            ) : view === 'info' ? (
              <div className="peerfusion-floating-chat-header-with-back">
                <button className="peerfusion-back-button" onClick={handleBackToChat}>
                  <BackIcon />
                </button>
                <div className="peerfusion-floating-chat-partner">
                  <span className="peerfusion-floating-partner-name">Chat Info</span>
                </div>
                <button 
                  className="peerfusion-close-button"
                  onClick={() => setIsOpen(false)}
                >
                  <CloseIcon />
                </button>
              </div>
            ) : (
              <div className="peerfusion-floating-chat-header-default">
                <h3>Messages</h3>
                <button 
                  className="peerfusion-close-button"
                  onClick={() => setIsOpen(false)}
                >
                  <CloseIcon />
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="peerfusion-floating-chat-content">
            {view === 'list' ? (
              <div className="peerfusion-floating-conversations-list">
                {conversations.length === 0 ? (
                  <div className="peerfusion-floating-empty">
                    <ChatIcon />
                    <p>No conversations yet</p>
                    <small>Start a new conversation to see it here</small>
                  </div>
                ) : (
                  conversations.map((conversation) => {
                    const unreadCount = conversationUnreadCounts[conversation.id] || 0;
                    
                    return (
                      <div
                        key={conversation.id}
                        className={`peerfusion-floating-conversation-item ${unreadCount > 0 ? 'unread' : ''}`}
                        onClick={() => handleConversationSelect(conversation)}
                      >
                        <div className="peerfusion-floating-avatar-container">
                          <img
                            src={ensureAvatarUrl(conversation.otherUser.avatar) || '/default-avatar.png'}
                            alt={conversation.otherUser.username}
                            className="peerfusion-floating-avatar"
                            onError={(e) => {
                              e.target.src = "/default-avatar.png";
                            }}
                          />
                          {unreadCount > 0 && (
                            <div className="peerfusion-floating-unread-indicator">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </div>
                          )}
                        </div>
                        <div className="peerfusion-floating-conversation-info">
                          <div className={`peerfusion-floating-conversation-name ${unreadCount > 0 ? 'unread' : ''}`}>
                            {conversation.otherUser.username}
                            {unreadCount > 0 && (
                              <span className="peerfusion-unread-text-indicator">
                                ({unreadCount > 99 ? '99+' : unreadCount})
                              </span>
                            )}
                          </div>
                          <div className={`peerfusion-floating-conversation-preview ${unreadCount > 0 ? 'unread' : ''}`}>
                            {conversation.lastMessage || "No messages yet"}
                          </div>
                          <div className="peerfusion-floating-conversation-time">
                            {formatTime(conversation.lastMessageTime)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : view === 'chat' ? (
              <div className="peerfusion-floating-chat-window">
                <div className="peerfusion-floating-chat-messages">
                  {messages.length === 0 ? (
                    <div className="peerfusion-floating-chat-empty">
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`peerfusion-floating-message ${
                          String(message.senderId) === String(user.user_id) ? 'sent' : 'received'
                        }`}
                      >
                        <div className="peerfusion-floating-message-content">
                          {message.fileType === "image" ? (
                            <img src={message.content} alt="Shared" className="peerfusion-floating-chat-image" />
                          ) : message.fileType === "pdf" || message.fileType === "doc" ? (
                            <a href={message.content} target="_blank" rel="noopener noreferrer" className="peerfusion-floating-chat-file">
                              <FileIcon />
                              <span>{message.fileName || "Download file"}</span>
                            </a>
                          ) : (
                            message.content
                          )}
                        </div>
                        <div className="peerfusion-floating-message-time">
                          {formatMessageTime(message.createdAt)}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className="peerfusion-floating-chat-input">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc,.docx"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) sendMessage(file);
                    }}
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="peerfusion-file-upload-icon"
                    title="Attach file"
                    disabled={sending}
                  >
                    <AttachmentIcon />
                  </button>

                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type a message..."
                    disabled={sending}
                    className="peerfusion-floating-input"
                  />

                  <button 
                    onClick={() => sendMessage()}
                    disabled={(!newMessage.trim() && !fileInputRef.current?.files?.[0]) || sending}
                    className="peerfusion-floating-send-btn"
                  >
                    <SendIcon />
                  </button>
                </div>
              </div>
            ) : (
              // Info Panel
              <div className="peerfusion-floating-info-panel">
                <div className="peerfusion-user-info-section">
                  <img
                    src={ensureAvatarUrl(activeConversation?.otherUser?.avatar) || '/default-avatar.png'}
                    alt={activeConversation?.otherUser?.username}
                    className="peerfusion-floating-info-avatar"
                    onError={(e) => {
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                  <h3 className="peerfusion-floating-info-name">
                    {activeConversation?.otherUser?.username}
                  </h3>
                  <p className="peerfusion-user-status">Online</p>
                </div>

                {(mediaItems.length > 0 || fileItems.length > 0) && (
                  <div className="peerfusion-shared-preview">
                    <h4>Recently Shared</h4>
                    <div className="peerfusion-preview-grid">
                      {mediaItems.slice(0, 4).map((media) => (
                        <div key={media.id} className="peerfusion-preview-item">
                          <img src={media.url} alt="Shared media" />
                        </div>
                      ))}
                      {fileItems.slice(0, 2).map((file) => (
                        <div key={file.id} className="peerfusion-preview-item file">
                          <FileIcon />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer for list view */}
          {view === 'list' && (
            <div className="peerfusion-floating-chat-footer">
              <button 
                className="peerfusion-view-all-chats-btn"
                onClick={() => {
                  window.location.href = '/chat';
                }}
              >
                View All Messages
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default FloatingChatToggle;