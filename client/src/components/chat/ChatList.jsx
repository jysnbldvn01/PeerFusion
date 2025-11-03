import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useLocation } from "react-router-dom";

// Icon components
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
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

const ChatList = ({ onSelect, currentUser, activeConversationId, searchQuery, onSearchChange, isMobile, unreadCounts, onMarkAsRead }) => {
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const userId = currentUser?.user_id || currentUser?.id;

    if (!userId) {
      setConversations([]);
      setFilteredConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", Number(userId)), 
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const convos = snapshot.docs.map((doc) => {
          const data = doc.data();
          const otherId = data.participants.find(
            (p) => Number(p) !== Number(userId)
          );
          const otherUser = data.userInfo?.[String(otherId)] || {};

          return {
            id: doc.id,
            ...data,
            otherUser: {
              id: otherId,
              username: otherUser.username || `User ${otherId}`,
              avatar: otherUser.avatar || "/default-avatar.png",
            },
            lastMessageTime: data.lastMessageTime?.toDate?.() || new Date(),
            hasUnread: unreadCounts[doc.id] > 0,
            unreadCount: unreadCounts[doc.id] || 0
          };
        });
        
        setConversations(convos);
        setFilteredConversations(convos);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Firestore error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, location.pathname, unreadCounts]);

  // Filter conversations based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(convo =>
        convo.otherUser.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (convo.lastMessage && convo.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

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

  const handleConversationSelect = (conversation) => {
    onSelect(conversation);
    // Mark as read when selected
    if (conversation.hasUnread && onMarkAsRead) {
      onMarkAsRead(conversation.id);
    }
  };

  if (loading) {
    return (
      <div className="peerfusion-chat-left">
        <div className="peerfusion-chat-left-header">
          <h2 className="peerfusion-chat-left-title">Messages</h2>
          <div className="peerfusion-chat-search-bar">
            <div className="peerfusion-chat-search-icon">
              <SearchIcon />
            </div>
            <input 
              className="peerfusion-chat-search-input-field"
              placeholder="Search conversations..." 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>
        <div className="peerfusion-chat-loading">
          <div className="peerfusion-chat-loading-spinner"></div>
          <p>Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="peerfusion-chat-left">
      {/* Mobile Controls - Only show back button when in chat view */}
      {isMobile && activeConversationId && (
        <div className="peerfusion-chat-mobile-controls">
          <button 
            className="peerfusion-chat-back-button"
            onClick={() => onSelect(null)}
          >
            <BackIcon />
            <span>Back</span>
          </button>
          <div className="peerfusion-chat-mobile-panel-title">Conversations</div>
          <div style={{width: '80px'}}></div>
        </div>
      )}

      <div className="peerfusion-chat-left-header">
        <h2 className="peerfusion-chat-left-title">Messages</h2>
        <div className="peerfusion-chat-search-bar">
          <div className="peerfusion-chat-search-icon">
            <SearchIcon />
          </div>
          <input 
            className="peerfusion-chat-search-input-field"
            placeholder="Search conversations..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="peerfusion-chat-conversations-list">
        {filteredConversations.length === 0 ? (
          <div className="peerfusion-chat-empty">
            <div className="peerfusion-chat-empty-icon">
              <ChatIcon />
            </div>
            <p>
              {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
            </p>
            <small>
              {searchQuery ? 'Try a different search term' : 'Start a new conversation to see it here'}
            </small>
          </div>
        ) : (
          filteredConversations.map((c) => (
            <div
              key={c.id}
              className={`peerfusion-chat-peer-item ${activeConversationId === c.id ? "active" : ""} ${c.hasUnread ? "unread" : ""}`}
              onClick={() => handleConversationSelect(c)}
            >
              <div className="peerfusion-chat-avatar-container">
                <img
                  src={c.otherUser.avatar}
                  alt={c.otherUser.username}
                  className="peerfusion-chat-peer-avatar"
                  onError={(e) => {
                    e.target.src = "/default-avatar.png";
                  }}
                />
                {c.hasUnread && (
                  <div className="peerfusion-chat-unread-indicator">
                    {c.unreadCount > 0 && c.unreadCount < 10 ? c.unreadCount : ""}
                  </div>
                )}
              </div>
              <div className="peerfusion-chat-peer-info">
                <div className={`peerfusion-chat-peer-name ${c.hasUnread ? "unread" : ""}`}>
                  {c.otherUser.username}
                </div>
                <div className={`peerfusion-chat-peer-message ${c.hasUnread ? "unread" : ""}`}>
                  {c.lastMessage || "No messages yet"}
                </div>
                <div className="peerfusion-chat-peer-time">
                  {formatTime(c.lastMessageTime)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;