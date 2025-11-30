import React, { useContext, useEffect, useMemo, useState, useCallback } from "react";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import { AuthContext } from "../context/AuthContext";
import "../css/chat.css";
// removed useLocation to avoid unused var

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { db } from "../firebase";
const API_BASE_URL = process.env.REACT_APP_API_URL;

// Icon components
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const MediaIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
  </svg>
);

const FileIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
  </svg>
);

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
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

const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
  </svg>
);

export default function ChatPage() {
  const { user, loading } = useContext(AuthContext);
  const [activeConversation, setActiveConversation] = useState(null);
  const [profilesById, setProfilesById] = useState({});

  // Ensure avatar is an absolute URL
const ensureAvatarUrl = (avatar) => {
  if (!avatar || typeof avatar !== 'string') return null;
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  if (avatar.startsWith('/uploads/')) {
    return `${API_BASE_URL}${avatar}`;
  }
  const file = avatar.replace(/^\/+/, '');
  return `${API_BASE_URL}/uploads/${file}`;
};
  // Search states
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");

  // UI states
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showReportUserModal, setShowReportUserModal] = useState(false);
  const [reportUserReason, setReportUserReason] = useState("");
  const [reportUserSubmitting, setReportUserSubmitting] = useState(false);
  const [reportUserOffense, setReportUserOffense] = useState('Harassment');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  // removed uploadProgress to avoid unused state warning

  // Media/files list
  const [mediaItems, setMediaItems] = useState([]);
  const [fileItems, setFileItems] = useState([]);

  // Unread messages tracking
  const [unreadCounts, setUnreadCounts] = useState({});

  // no location usage needed here

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('list');

  const ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'video/mp4',
    'video/avi',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileView('list');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update mobile view based on active conversation
  useEffect(() => {
    if (isMobile) {
      if (activeConversation) {
        setMobileView('chat');
      } else {
        setMobileView('list');
      }
    }
  }, [activeConversation, isMobile]);

  // removed selectedUser effect - not used

  // Subscribe to messages for media/files
  useEffect(() => {
    if (!activeConversation?.id || !user?.user_id) {
      setMediaItems([]);
      setFileItems([]);
      return;
    }

    const convId = activeConversation.id;
    const currentUserId = String(user.user_id);
    const q = query(
      collection(db, "conversations", convId, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const images = [];
        const files = [];

        snapshot.docs.forEach((d) => {
          const m = { id: d.id, ...d.data() };

          // Skip messages that were unsent for everyone
          if (m.unsentForEveryone) {
            return;
          }

          // Skip messages that are hidden for the current user
          if ((m.hiddenFor || []).map(String).includes(currentUserId)) {
            return;
          }

          const ft = (m.fileType || "").toString().toLowerCase();

          if (ft === "image" && m.content) {
            images.push({
              id: m.id,
              url: m.content,
              fileType: ft,
              fileName: m.fileName || null,
              createdAt: m.createdAt,
              senderId: m.senderId,
            });
          } else if (["pdf", "doc"].includes(ft) && m.content) {
            files.push({
              id: m.id,
              url: m.content,
              fileType: ft,
              fileName: m.fileName || m.content.split("/").pop(),
              createdAt: m.createdAt,
              senderId: m.senderId,
            });
          }
        });

        setMediaItems(images);
        setFileItems(files);
      },
      (err) => {
        console.error("Failed to subscribe to conversation messages for media/files:", err);
        setMediaItems([]);
        setFileItems([]);
      }
    );

    return () => unsubscribe();
  }, [activeConversation?.id, user?.user_id]);

  // Track unread messages
  useEffect(() => {
    if (!user?.user_id) return;

    const unsubscribeCallbacks = [];

    // Subscribe to all conversations to track unread messages
    const conversationsQuery = query(
      collection(db, "conversations"),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribeConversations = onSnapshot(conversationsQuery, (snapshot) => {
      snapshot.docs.forEach((conversationDoc) => {
        const conversation = conversationDoc.data();
        const conversationId = conversationDoc.id;
        
        if (conversation.participants?.includes(Number(user.user_id))) {
          // Subscribe to messages for this conversation
          const messagesQuery = query(
            collection(db, "conversations", conversationId, "messages"),
            orderBy("createdAt", "desc")
          );

          const unsubscribeMessages = onSnapshot(messagesQuery, (messagesSnapshot) => {
            let unreadCount = 0;
            
            messagesSnapshot.docs.forEach((messageDoc) => {
              const message = messageDoc.data();
              // Check if message is from other user and not seen by current user
              if (String(message.senderId) !== String(user.user_id)) {
                const seenBy = message.seenBy || [];
                if (!seenBy.map(String).includes(String(user.user_id))) {
                  unreadCount++;
                }
              }
            });

            setUnreadCounts(prev => ({
              ...prev,
              [conversationId]: unreadCount
            }));
          });

          unsubscribeCallbacks.push(unsubscribeMessages);
        }
      });
    });

    unsubscribeCallbacks.push(unsubscribeConversations);

    return () => {
      unsubscribeCallbacks.forEach(unsubscribe => unsubscribe());
    };
  }, [user?.user_id]);

  const handleMarkAsRead = async (conversationId) => {
    if (!user?.user_id || !conversationId) return;

    try {
      // Mark all messages in this conversation as read
      const messagesQuery = query(
        collection(db, "conversations", conversationId, "messages"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        const updates = [];
        
        snapshot.docs.forEach((messageDoc) => {
          const message = messageDoc.data();
          // If message is from other user and not seen by current user
          if (String(message.senderId) !== String(user.user_id)) {
            const seenBy = message.seenBy || [];
            if (!seenBy.map(String).includes(String(user.user_id))) {
              const messageRef = doc(db, "conversations", conversationId, "messages", messageDoc.id);
              updates.push(updateDoc(messageRef, {
                seenBy: arrayUnion(user.user_id)
              }));
            }
          }
        });

        if (updates.length > 0) {
          await Promise.all(updates);
        }
        
        // Update local state
        setUnreadCounts(prev => ({
          ...prev,
          [conversationId]: 0
        }));

        // Unsubscribe after processing
        unsubscribe();
      });
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  // File handling functions
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const validFiles = [];
    const errors = [];

    files.forEach(file => {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Invalid file type`);
        return;
      }
      
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: File too large (max 50MB)`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      alert('Some files were rejected:\n' + errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setEvidenceFiles(prev => [...prev, ...validFiles]);
    }

    // Reset file input
    event.target.value = '';
  };

  const removeFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type === 'application/pdf') return '📄';
    return '📎';
  };

  // Determine container class for mobile views
  const getContainerClass = () => {
    if (!isMobile) return "peerfusion-chat-container";
    
    switch (mobileView) {
      case 'chat':
        return "peerfusion-chat-container chat-active";
      case 'info':
        return "peerfusion-chat-container info-active";
      default:
        return "peerfusion-chat-container";
    }
  };

  // Mobile navigation handlers
  const handleBackToList = () => {
    setActiveConversation(null);
    setMobileView('list');
  };

  const handleShowInfo = () => {
    setMobileView('info');
  };

  const handleBackToChat = () => {
    setMobileView('chat');
  };

  // When ChatWindow resolves the other user's avatar/username, mirror it into activeConversation
  const handleOtherUserResolved = useCallback((resolved) => {
    setActiveConversation((prev) => {
      if (!prev) return prev;
      if (!resolved || String(prev.otherUser?.id) !== String(resolved.id)) return prev;
      return {
        ...prev,
        otherUser: {
          ...prev.otherUser,
          username: resolved.username || prev.otherUser?.username,
          avatar: resolved.avatar ? (resolved.avatar.split('/').pop() || resolved.avatar) : prev.otherUser?.avatar
        }
      };
    });
  }, []);

  // Preload other user profiles for instant avatar resolution
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const API = API_BASE_URL.replace(/\/$/, '');
    fetch(`${API}/profile/others`, { headers: { Authorization: `Bearer ${token}` } })
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
  }, [user?.user_id]);

  // Enhance a conversation with latest profile avatar immediately
  const enhanceConversation = useCallback((c) => {
    if (!c) return c;
    const otherId = c.otherUser?.id;
    const profile = profilesById[String(otherId)] || {};
    const avatar = profile.avatar || c.otherUser?.avatar || null;
    return {
      ...c,
      otherUser: {
        ...c.otherUser,
        username: profile.username || c.otherUser?.username,
        avatar
      }
    };
  }, [profilesById]);

  // When selecting from list, enhance immediately to avoid placeholder-only state
  const handleSelectConversation = useCallback((c) => {
    setActiveConversation(enhanceConversation(c));
  }, [enhanceConversation]);

  // If profiles load after a conversation is active, re-enhance once to update avatar instantly
  useEffect(() => {
    if (!activeConversation?.otherUser?.id) return;
    setActiveConversation(prev => enhanceConversation(prev));
  }, [profilesById, enhanceConversation]);

  // Modal handlers
  const openMediaModal = () => setShowMediaModal(true);
  const openFilesModal = () => setShowFilesModal(true);
  const closeMediaModal = () => setShowMediaModal(false);
  const closeFilesModal = () => setShowFilesModal(false);

      const handleReportUser = async () => {
        if (!activeConversation?.otherUser?.id) return;
        
        try {
          setReportUserSubmitting(true);
          const token = localStorage.getItem('token');
          const formData = new FormData();
          
          formData.append('reported_user_id', activeConversation.otherUser.id);
          formData.append('report_type', reportUserOffense);
          formData.append('description', reportUserReason);
          formData.append('source', 'chat_page');
          
          evidenceFiles.forEach(file => {
            formData.append('evidence', file);
          });

          const res = await fetch(`${API_BASE_URL}/api/reports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          });
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          const data = await res.json();
          
          if (data?.success) {
            alert('Report submitted successfully.');
            setShowReportUserModal(false);
            setReportUserReason("");
            setReportUserOffense('Harassment');
            setEvidenceFiles([]);
          } else {
            alert(data?.error || 'Failed to submit report');
          }
        } catch (e) {
          console.error('Report user error:', e);
          alert('Error submitting report: ' + e.message);
        } finally {
          setReportUserSubmitting(false);
        }
      };

  if (loading) {
    return (
      <div className="peerfusion-chat-loading">
        <div className="peerfusion-chat-loading-spinner"></div>
        <p>Loading your conversations...</p>
      </div>
    );
  }

  return (
    <div className={getContainerClass()}>
      {/* LEFT: Chat list */}
      <div className="peerfusion-chat-left">
        <ChatList
          currentUser={user}
          activeConversationId={activeConversation?.id}
          onSelect={handleSelectConversation}
          searchQuery={conversationSearch}
          onSearchChange={setConversationSearch}
          isMobile={isMobile}
          unreadCounts={unreadCounts}
          onMarkAsRead={handleMarkAsRead}
        />
      </div>

      {/* MIDDLE: Chat Window */}
      <div className="peerfusion-chat-middle">
        {activeConversation ? (
          <ChatWindow
            conversationId={activeConversation.id}
            currentUser={user}
            searchTerm={messageSearch}
            onBackToList={handleBackToList}
            onShowInfo={handleShowInfo}
            isMobile={isMobile}
            onOtherUserResolved={handleOtherUserResolved}
            externalProfilesById={profilesById}
          />
        ) : (
          !isMobile && (
            <div className="peerfusion-chat-empty">
              <div className="peerfusion-chat-empty-icon">
                <ChatIcon />
              </div>
              <h3>Start a Conversation</h3>
              <p>Select a chat from the sidebar to begin messaging</p>
            </div>
          )
        )}
      </div>

      {/* RIGHT: Conversation Info */}
      {activeConversation && (
        <div className="peerfusion-chat-right">
          {/* Mobile Controls */}
          {isMobile && (
            <div className="peerfusion-chat-mobile-controls">
              <button 
                className="peerfusion-chat-back-button"
                onClick={handleBackToChat}
              >
                <BackIcon />
                <span>Back</span>
              </button>
              <div className="peerfusion-chat-mobile-panel-title">Chat Info</div>
              <div style={{width: '80px'}}></div>
            </div>
          )}

          <div className="peerfusion-chat-right-content">
            {/* User Info */}
            <div className="peerfusion-chat-user-info-section" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="peerfusion-chat-right-avatar" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8efe5', color: '#666', fontWeight: 700 }}>
                {activeConversation.otherUser?.username?.charAt(0)?.toUpperCase() || "U"}
                {activeConversation.otherUser?.avatar && (
                  <img
                    src={ensureAvatarUrl(activeConversation.otherUser.avatar)}
                    alt={activeConversation.otherUser.username}
                    className="peerfusion-chat-right-avatar"
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
              </div>
              <h3 className="peerfusion-chat-right-name">
                {activeConversation.otherUser?.username}
              </h3>
              <p className="peerfusion-chat-user-status">Online</p>
            </div>

            {/* Search in Conversation - AT THE TOP */}
            <div className="peerfusion-chat-search-section">
              <div className="peerfusion-chat-search-header">
                <SearchIcon />
                <span>Search in conversation</span>
              </div>
              <input
                type="text"
                placeholder="Search messages..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="peerfusion-chat-search-conversation-input"
              />
            </div>

            {/* Quick Actions - MEDIA AND FILES ONLY */}
            <div className="peerfusion-chat-quick-actions">
              <div className="peerfusion-chat-action-group">
                <button
                  onClick={openMediaModal}
                  className="peerfusion-chat-action-btn"
                >
                  <MediaIcon />
                  Media ({mediaItems.length})
                </button>
                <button
                  onClick={openFilesModal}
                  className="peerfusion-chat-action-btn"
                >
                  <FileIcon />
                  Files ({fileItems.length})
                </button>
              </div>
            </div>

            {/* Shared Media Preview */}
            {(mediaItems.length > 0 || fileItems.length > 0) && (
              <div className="peerfusion-chat-shared-preview">
                <h4>Recently Shared</h4>
                <div className="peerfusion-chat-preview-grid">
                  {mediaItems.slice(0, 4).map((media) => (
                    <div key={media.id} className="peerfusion-chat-preview-item">
                      <img src={media.url} alt="Shared media" />
                    </div>
                  ))}
                  {fileItems.slice(0, 2).map((file) => (
                    <div key={file.id} className="peerfusion-chat-preview-item file">
                      <FileIcon />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Report User Action - AT THE BOTTOM */}
            <div className="peerfusion-chat-action-group" style={{ marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid #e8efe5' }}>
              <button
                onClick={() => setShowReportUserModal(true)}
                className="peerfusion-chat-report-user-btn"
                title="Report this user"
              >
                <FlagIcon />
                Report User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && activeConversation && (
        <div className="peerfusion-chat-modal-overlay" onClick={closeMediaModal}>
          <div className="peerfusion-chat-modal-content" onClick={(e) => e.stopPropagation()} style={{position: 'relative'}}>
            <button className="peerfusion-close-modal" onClick={closeMediaModal}>
              <CloseIcon />
            </button>
            <div className="peerfusion-chat-modal-header">
              <h3 className="peerfusion-chat-modal-title">
                Shared Media ({mediaItems.length})
              </h3>
            </div>

            <div className="peerfusion-chat-modal-body">
              {mediaItems.length === 0 ? (
                <div className="peerfusion-chat-empty-state">
                  <MediaIcon />
                  <p>No images shared yet</p>
                </div>
              ) : (
                <div className="peerfusion-chat-media-grid">
                  {mediaItems.map((media) => (
                    <a
                      key={media.id}
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="peerfusion-chat-media-item"
                    >
                      <img src={media.url} alt="Shared media" />
                      <div className="peerfusion-chat-media-info">
                        {media.fileName || "Image"}
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Files Modal */}
      {showFilesModal && activeConversation && (
        <div className="peerfusion-chat-modal-overlay" onClick={closeFilesModal}>
          <div className="peerfusion-chat-modal-content" onClick={(e) => e.stopPropagation()} style={{position: 'relative'}}>
            <button className="peerfusion-close-modal" onClick={closeFilesModal}>
              <CloseIcon />
            </button>
            <div className="peerfusion-chat-modal-header">
              <h3 className="peerfusion-chat-modal-title">
                Shared Files ({fileItems.length})
              </h3>
            </div>

            <div className="peerfusion-chat-modal-body">
              {fileItems.length === 0 ? (
                <div className="peerfusion-chat-empty-state">
                  <FileIcon />
                  <p>No files shared yet</p>
                </div>
              ) : (
                <div className="peerfusion-chat-files-list">
                  {fileItems.map((file) => (
                    <div key={file.id} className="peerfusion-chat-file-item">
                      <div className="peerfusion-chat-file-info">
                        <FileIcon />
                        <div className="peerfusion-chat-file-details">
                          <div className="peerfusion-chat-file-name">
                            {file.fileName || file.url.split("/").pop()}
                          </div>
                          <div className="peerfusion-chat-file-type">
                            {file.fileType?.toUpperCase()} File
                          </div>
                        </div>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="peerfusion-chat-download-btn"
                      >
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Report User Modal */}
      {showReportUserModal && activeConversation && (
        <div className="peerfusion-chat-modal-overlay" onClick={() => setShowReportUserModal(false)}>
          <div className="peerfusion-chat-modal-content peerfusion-chat-report-modal" onClick={(e) => e.stopPropagation()} style={{position: 'relative'}}>
            <button className="peerfusion-close-modal" onClick={() => setShowReportUserModal(false)}>
              <CloseIcon />
            </button>
            <div className="peerfusion-chat-modal-header">
              <h3 className="peerfusion-chat-modal-title">Report User</h3>
            </div>
            <div className="peerfusion-chat-modal-body">
              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Reporting</label>
                <div className="peerfusion-chat-form-input">
                  {activeConversation.otherUser?.username || `User ${activeConversation.otherUser?.id}`}
                </div>
              </div>
              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Report Type</label>
                <select
                  className="peerfusion-chat-form-input"
                  value={reportUserOffense}
                  onChange={(e) => setReportUserOffense(e.target.value)}
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
                  placeholder="Describe why you are reporting this user"
                  value={reportUserReason}
                  onChange={(e) => setReportUserReason(e.target.value)}
                  rows={4}
                />
                <div className="peerfusion-chat-form-help">
                  Your report will be reviewed by our moderation team.
                </div>
              </div>

              {/* Evidence Upload Section */}
              <div className="peerfusion-chat-form-group">
                <label className="peerfusion-chat-form-label">Evidence (Optional)</label>
                <div className="evidence-upload-area">
                  <input
                    type="file"
                    id="chat-evidence-upload"
                    multiple
                    accept=".jpg,.jpeg,.png,.gif,.mp4,.avi,.pdf,.doc,.docx"
                    onChange={handleFileSelect}
                    className="evidence-file-input"
                  />
                  <label htmlFor="chat-evidence-upload" className="evidence-upload-label">
                    <div className="upload-icon"><UploadIcon /></div>
                    <div className="upload-text">
                      <strong>Click to upload evidence</strong>
                      <span>or drag and drop files here</span>
                    </div>
                  </label>
                </div>

                {/* File List */}
                {evidenceFiles.length > 0 && (
                  <div className="evidence-file-list">
                    <h4>Selected Files ({evidenceFiles.length})</h4>
                    {evidenceFiles.map((file, index) => (
                      <div key={index} className="evidence-file-item">
                        <div className="file-info">
                          <span className="file-icon">{getFileIcon(file)}</span>
                          <div className="file-details">
                            <span className="file-name">{file.name}</span>
                            <span className="file-size">{formatFileSize(file.size)}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="remove-file-btn"
                          title="Remove file"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div> 

              <div className="peerfusion-chat-modal-actions">
                <button
                  onClick={handleReportUser}
                  className="peerfusion-chat-primary-btn peerfusion-chat-report-submit-btn"
                  disabled={reportUserSubmitting}
                >
                  {reportUserSubmitting ? (
                    <>
                      <div className="peerfusion-chat-loading-spinner-small"></div>
                      Submitting...
                    </>
                  ) : (
                    `Submit Report ${evidenceFiles.length > 0 ? `(${evidenceFiles.length} files)` : ''}`
                  )}
                </button>
                <button onClick={() => setShowReportUserModal(false)} className="peerfusion-chat-secondary-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};