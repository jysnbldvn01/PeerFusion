import React, { useContext, useEffect, useState } from "react";
import ChatList from "../components/chat/ChatList";
import ChatWindow from "../components/chat/ChatWindow";
import { AuthContext } from "../context/AuthContext";
import "../css/chat.css";
import { useLocation } from "react-router-dom";
import axios from "axios";

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

// Icon components
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
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

export default function ChatPage() {
  const { user, loading } = useContext(AuthContext);
  const [activeConversation, setActiveConversation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Search states
  const [conversationSearch, setConversationSearch] = useState("");
  const [messageSearch, setMessageSearch] = useState("");

  // UI states
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");

  // Media/files list
  const [mediaItems, setMediaItems] = useState([]);
  const [fileItems, setFileItems] = useState([]);

  // Unread messages tracking
  const [unreadCounts, setUnreadCounts] = useState({});

  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Mobile state
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list', 'chat', 'info'

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileView('list'); // Reset to list view on desktop
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

  useEffect(() => {
    if (location.pathname === "/chat") {
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (activeConversation?.otherUser) {
      setSelectedUser(activeConversation.otherUser);
    } else {
      setSelectedUser(null);
    }
  }, [activeConversation]);

  // Subscribe to messages for media/files
  useEffect(() => {
    if (!activeConversation?.id) {
      setMediaItems([]);
      setFileItems([]);
      return;
    }

    const convId = activeConversation.id;
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
  }, [activeConversation?.id]);

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

  const handleScheduleMeeting = async () => {
    if (!meetingDate || !activeConversation || !user) {
      alert("Please select a date and time for the meeting.");
      return;
    }

    try {
      const res = await axios.post("http://localhost:5000/api/meeting/schedule", {
        conversationId: activeConversation.id,
        participants: [user.id, activeConversation.otherUser.id],
        scheduledAt: meetingDate,
      });

      if (res.data.success) {
        alert("✅ Meeting scheduled successfully!");
        setShowMeetingModal(false);
        setMeetingDate("");
      } else {
        alert("❌ Failed to schedule meeting.");
      }
    } catch (err) {
      console.error("Error scheduling meeting:", err);
      alert("Error scheduling meeting. Please try again.");
    }
  };

  // Modal handlers
  const openMediaModal = () => setShowMediaModal(true);
  const openFilesModal = () => setShowFilesModal(true);
  const closeMediaModal = () => setShowMediaModal(false);
  const closeFilesModal = () => setShowFilesModal(false);

  if (loading) {
    return (
      <div className="peerfusion-chat-loading">
        <div className="peerfusion-loading-spinner"></div>
        <p>Loading your conversations...</p>
      </div>
    );
  }

  return (
    <div className={getContainerClass()}>
      {/* LEFT: Chat list - Always rendered but positioned by CSS */}
      <div className="peerfusion-chat-left">
        <ChatList
          key={`${user?.id || "guest"}-${refreshTrigger}`}
          currentUser={user}
          activeConversationId={activeConversation?.id}
          onSelect={(c) => setActiveConversation(c)}
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
          />
        ) : (
          !isMobile && ( // Only show empty state on desktop
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
            <div className="peerfusion-mobile-controls">
              <button 
                className="peerfusion-back-button"
                onClick={handleBackToChat}
              >
                <BackIcon />
                <span>Back</span>
              </button>
              <div className="peerfusion-mobile-panel-title">Chat Info</div>
              <div style={{width: '80px'}}></div>
            </div>
          )}

          <div className="peerfusion-chat-right-content">
            {/* User Info */}
            <div className="peerfusion-user-info-section">
              {activeConversation.otherUser?.avatar ? (
                <img
                  src={activeConversation.otherUser.avatar}
                  alt={activeConversation.otherUser.username}
                  className="peerfusion-chat-right-avatar"
                />
              ) : (
                <div className="peerfusion-chat-right-avatar peerfusion-avatar-placeholder">
                  {activeConversation.otherUser?.username?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
              <h3 className="peerfusion-chat-right-name">
                {activeConversation.otherUser?.username}
              </h3>
              <p className="peerfusion-user-status">Online</p>
            </div>

            {/* Quick Actions */}
            <div className="peerfusion-quick-actions">
              <button
                onClick={() => setShowMeetingModal(true)}
                className="peerfusion-action-btn primary"
              >
                <CalendarIcon />
                Schedule Meeting
              </button>
              
              <div className="peerfusion-action-group">
                <button
                  onClick={openMediaModal}
                  className="peerfusion-action-btn"
                >
                  <MediaIcon />
                  Media ({mediaItems.length})
                </button>
                <button
                  onClick={openFilesModal}
                  className="peerfusion-action-btn"
                >
                  <FileIcon />
                  Files ({fileItems.length})
                </button>
              </div>
            </div>

            {/* Search in Conversation */}
            <div className="peerfusion-search-section">
              <div className="peerfusion-search-header">
                <SearchIcon />
                <span>Search in conversation</span>
              </div>
              <input
                type="text"
                placeholder="Search messages..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="peerfusion-search-conversation-input"
              />
            </div>

            {/* Shared Media Preview */}
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
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && activeConversation && (
        <div className="peerfusion-modal-overlay" onClick={closeMediaModal}>
          <div className="peerfusion-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="peerfusion-modal-header">
              <h3 className="peerfusion-modal-title">
                Shared Media ({mediaItems.length})
              </h3>
              <button className="peerfusion-close-modal" onClick={closeMediaModal}>
                <CloseIcon />
              </button>
            </div>

            <div className="peerfusion-modal-body">
              {mediaItems.length === 0 ? (
                <div className="peerfusion-empty-state">
                  <MediaIcon />
                  <p>No images shared yet</p>
                </div>
              ) : (
                <div className="peerfusion-media-grid">
                  {mediaItems.map((media) => (
                    <a
                      key={media.id}
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="peerfusion-media-item"
                    >
                      <img src={media.url} alt="Shared media" />
                      <div className="peerfusion-media-info">
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
        <div className="peerfusion-modal-overlay" onClick={closeFilesModal}>
          <div className="peerfusion-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="peerfusion-modal-header">
              <h3 className="peerfusion-modal-title">
                Shared Files ({fileItems.length})
              </h3>
              <button className="peerfusion-close-modal" onClick={closeFilesModal}>
                <CloseIcon />
              </button>
            </div>

            <div className="peerfusion-modal-body">
              {fileItems.length === 0 ? (
                <div className="peerfusion-empty-state">
                  <FileIcon />
                  <p>No files shared yet</p>
                </div>
              ) : (
                <div className="peerfusion-files-list">
                  {fileItems.map((file) => (
                    <div key={file.id} className="peerfusion-file-item">
                      <div className="peerfusion-file-info">
                        <FileIcon />
                        <div className="peerfusion-file-details">
                          <div className="peerfusion-file-name">
                            {file.fileName || file.url.split("/").pop()}
                          </div>
                          <div className="peerfusion-file-type">
                            {file.fileType?.toUpperCase()} File
                          </div>
                        </div>
                      </div>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="peerfusion-download-btn"
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

      {/* Schedule Meeting Modal */}
      {showMeetingModal && (
        <div className="peerfusion-modal-overlay">
          <div className="peerfusion-modal-content peerfusion-meeting-modal">
            <div className="peerfusion-modal-header">
              <h3 className="peerfusion-modal-title">Schedule Meeting</h3>
              <button 
                className="peerfusion-close-modal"
                onClick={() => setShowMeetingModal(false)}
              >
                <CloseIcon />
              </button>
            </div>

            <div className="peerfusion-modal-body">
              <div className="peerfusion-form-group">
                <label>Meeting Date & Time</label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="peerfusion-form-input"
                />
              </div>
              
              <div className="peerfusion-meeting-participants">
                <label>Participants</label>
                <div className="peerfusion-participants-list">
                  <div className="peerfusion-participant">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.username} 
                        className="peerfusion-participant-avatar"
                      />
                    ) : (
                      <div className="peerfusion-participant-avatar-placeholder">
                        {user?.username?.charAt(0)?.toUpperCase() || "Y"}
                      </div>
                    )}
                    <span>You</span>
                  </div>
                  <div className="peerfusion-participant">
                    {activeConversation?.otherUser?.avatar ? (
                      <img 
                        src={activeConversation.otherUser.avatar} 
                        alt={activeConversation.otherUser.username} 
                        className="peerfusion-participant-avatar"
                      />
                    ) : (
                      <div className="peerfusion-participant-avatar-placeholder">
                        {activeConversation?.otherUser?.username?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}
                    <span>{activeConversation?.otherUser?.username}</span>
                  </div>
                </div>
              </div>

              <div className="peerfusion-modal-actions">
                <button
                  onClick={handleScheduleMeeting}
                  className="peerfusion-primary-btn"
                  disabled={!meetingDate}
                >
                  <CalendarIcon />
                  Schedule Meeting
                </button>
                <button
                  onClick={() => setShowMeetingModal(false)}
                  className="peerfusion-secondary-btn"
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
}