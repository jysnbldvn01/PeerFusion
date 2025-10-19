import React, { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { useLocation } from "react-router-dom";

const ChatList = ({ onSelect, currentUser, activeConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    console.log("🔍 Current User in ChatList:", currentUser);
    
    const userId = currentUser?.user_id || currentUser?.id;
    
    console.log("🔍 User ID to use for Firestore:", userId);

    if (!userId) {
      console.log("❌ No user ID available");
      setConversations([]);
      setLoading(false);
      return;
    }

    console.log("🔄 Setting up Firestore listener for user:", userId);
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
          };
        });
        
        console.log("✅ Conversations loaded:", convos.length);
        console.log("✅ Conversation participants:", convos.map(c => c.participants));
        setConversations(convos);
        setLoading(false);
      },
      (error) => {
        console.error("❌ Firestore error:", error);
        setLoading(false);
      }
    );

    return () => {
      console.log("🧹 Cleaning up Firestore listener");
      unsubscribe();
    };
  }, [currentUser, location.pathname]);

  if (loading) {
    return (
      <div className="chat-left">
        <div className="search-bar">
          <input placeholder="Search a peer" />
        </div>
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#666'
        }}>
          Loading conversations...
        </div>
      </div>
    );
  }

  return (
    <div className="chat-left">
      <div className="search-bar">
        <input placeholder="Search a peer" />
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {conversations.length === 0 ? (
          <div style={{ 
            padding: "20px", 
            textAlign: "center", 
            color: "#666",
            fontSize: "14px"
          }}>
            No conversations found
          </div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`peer-item ${activeConversationId === c.id ? "active" : ""}`}
              onClick={() => onSelect(c)}
            >
              <img
                src={c.otherUser.avatar}
                alt={c.otherUser.username}
                width={40}
                height={40}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                onError={(e) => {
                  e.target.src = "/default-avatar.png";
                }}
              />
              <div>
                <div className="peer-name">{c.otherUser.username}</div>
                <div className="peer-message">{c.lastMessage || "No messages yet"}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;