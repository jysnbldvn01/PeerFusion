// client/src/pages/ChatPage.jsx
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
} from "firebase/firestore";
import { db } from "../firebase";

export default function ChatPage() {
  const { user, loading } = useContext(AuthContext);
  const [activeConversation, setActiveConversation] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Right-panel UI states
  const [isMuted, setIsMuted] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showFilesModal, setShowFilesModal] = useState(false);

  // Media/files list taken from messages subcollection
  const [mediaItems, setMediaItems] = useState([]); // images
  const [fileItems, setFileItems] = useState([]); // pdf/doc/other files

  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const location = useLocation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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

  // Subscribe to messages for the active conversation to fill media/files in right panel
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

          // a message might store file URL in `content` (our earlier convention)
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
          } else if (!m.fileType && m.content && typeof m.content === "string" && m.content.startsWith("http")) {
            // fallback: if content is a URL but fileType missing, try to infer by extension
            const lower = m.content.toLowerCase();
            if (lower.match(/\.(jpg|jpeg|png|gif)$/)) {
              images.push({ id: m.id, url: m.content, fileType: "image", fileName: m.fileName || m.content.split("/").pop(), createdAt: m.createdAt, senderId: m.senderId });
            } else if (lower.match(/\.(pdf)$/)) {
              files.push({ id: m.id, url: m.content, fileType: "pdf", fileName: m.fileName || m.content.split("/").pop(), createdAt: m.createdAt, senderId: m.senderId });
            } else if (lower.match(/\.(docx?|pptx?|xlsx?)$/)) {
              files.push({ id: m.id, url: m.content, fileType: "doc", fileName: m.fileName || m.content.split("/").pop(), createdAt: m.createdAt, senderId: m.senderId });
            }
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

  const handleScheduleMeeting = async () => {
    if (!meetingDate || !activeConversation || !user) {
      alert("Please select a date and conversation.");
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
      alert("Error scheduling meeting");
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          height: "97vh",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading user data...
      </div>
    );
  }

  // UI helpers
  const onMuteToggle = () => setIsMuted((v) => !v);
  const openMediaModal = () => setShowMediaModal(true);
  const openFilesModal = () => setShowFilesModal(true);
  const closeMediaModal = () => setShowMediaModal(false);
  const closeFilesModal = () => setShowFilesModal(false);

  return (
    <div style={{ display: "flex", height: "97vh" }}>
      {/* LEFT: Chat list */}
      <ChatList
        key={`${user?.id || "guest"}-${refreshTrigger}`}
        currentUser={user}
        activeConversationId={activeConversation?.id}
        onSelect={(c) => setActiveConversation(c)}
      />

      {/* MIDDLE: Chat Window */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {activeConversation ? (
          <>
            <div
              style={{
                background: "#689d6df5",
                color: "#fff",
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {activeConversation.otherUser?.avatar ? (
                  <img
                    src={activeConversation.otherUser.avatar}
                    alt={activeConversation.otherUser.username}
                    width={32}
                    height={32}
                    style={{ borderRadius: "50%" }}
                  />
                ) : (
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#e2dfdfff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#666",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {activeConversation.otherUser?.username?.charAt(0) || "U"}
                  </div>
                )}
                <span>{activeConversation.otherUser?.username}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  className="meeting-btn"
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowMeetingModal(true)}
                >
                  📅
                </div>
              </div>
            </div>

            <ChatWindow
              conversationId={activeConversation.id}
              currentUser={user}
              searchTerm={searchTerm}
            />
          </>
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
            }}
          >
            Select a conversation to start chatting
          </div>
        )}
      </div>

      {/* RIGHT: Conversation Info & Actions */}
      {activeConversation && (
        <div
          style={{
            width: 280,
            borderLeft: "1px solid #ddd",
            background: "#B3CCAE",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Avatar */}
          {activeConversation.otherUser?.avatar ? (
            <img
              src={activeConversation.otherUser.avatar}
              alt={activeConversation.otherUser.username}
              width={96}
              height={96}
              style={{ borderRadius: "50%", marginBottom: 8, objectFit: "cover" }}
              onError={(e) => (e.target.style.display = "none")}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "#B3CCAE",
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#666",
                fontSize: 28,
                fontWeight: "700",
              }}
            >
              {activeConversation.otherUser?.username?.charAt(0) || "U"}
            </div>
          )}

          <h3 style={{ margin: 0, marginBottom: 8 }}>{activeConversation.otherUser?.username}</h3>

          {/* Actions */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              onClick={onMuteToggle}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: isMuted ? "#60cc4ac4" : "#37632eb2",
                textAlign: "left",
              }}
            >
              {isMuted ? "🔈 Unmute" : "🔇 Mute"}
            </button>

            <button
              onClick={() => {
                setShowSearch((s) => !s);
                if (showSearch) setSearchTerm("");
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                background: "#60cc4ac4",
                textAlign: "left",
              }}
            >
              🔍 Search
            </button>

            {showSearch && (
              <input
                type="text"
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: 8,
                  border: "1px solid #60cc4ac4",
                  marginTop: 6,
                }}
              />
            )}
          </div>

          {/* Media & Files */}
          <div style={{ marginTop: 12, width: "100%" }}>
            <div style={{ fontWeight: "700", marginBottom: 8 }}>Media and Files</div>
            <button
              onClick={openMediaModal}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                marginBottom: 6,
                background: "#60cc4ac4",
              }}
            >
              🖼 Media ({mediaItems.length})
            </button>
            <button
              onClick={openFilesModal}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                background: "#60cc4ac4",
              }}
            >
              📄 Files ({fileItems.length})
            </button>
          </div>
        </div>
      )}

      {/* Media Modal */}
      {showMediaModal && activeConversation && (
        <div
          onClick={closeMediaModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 760,
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#60cc4ac4",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Shared Media</h3>
              <button onClick={closeMediaModal} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✖</button>
            </div>

            {mediaItems.length === 0 ? (
              <div style={{ color: "#666" }}>No images shared in this conversation.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                {mediaItems.map((m) => (
                  <div key={m.id} style={{ borderRadius: 8, overflow: "hidden", background: "#fafafa", padding: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", textDecoration: "none" }}>
                      <img src={m.url} alt={m.fileName || "media"} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} />
                    </a>
                    <div style={{ fontSize: 12, color: "#333", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{m.fileName || m.url.split("/").pop()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Files Modal */}
      {showFilesModal && activeConversation && (
        <div
          onClick={closeFilesModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 700,
              maxHeight: "80vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Shared Files</h3>
              <button onClick={closeFilesModal} style={{ border: "none", background: "transparent", cursor: "pointer" }}>✖</button>
            </div>

            {fileItems.length === 0 ? (
              <div style={{ color: "#666" }}>No files shared in this conversation.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {fileItems.map((f) => (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, borderRadius: 8, background: "#fafafa" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <span style={{ fontSize: 20 }}>📄</span>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ fontWeight: 600 }}>{f.fileName || f.url.split("/").pop()}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{f.fileType?.toUpperCase()}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                        <button style={{ border: "none", padding: "6px 10px", borderRadius: 6, cursor: "pointer", background: "#689d6d", color: "#fff" }}>Open</button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/*  Schedule Meeting Modal */}
      {showMeetingModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1500,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 20,
              borderRadius: 10,
              width: 350,
              textAlign: "center",
            }}
          >
            <h3>📅 Schedule a Meeting</h3>
            <input
              type="datetime-local"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              style={{
                marginTop: 10,
                padding: 8,
                width: "100%",
                borderRadius: 6,
                border: "1px solid #ccc",
              }}
            />
            <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
              <button
                onClick={handleScheduleMeeting}
                style={{
                  flex: 1,
                  background: "#689d6df5",
                  color: "white",
                  padding: 8,
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Schedule
              </button>
              <button
                onClick={() => setShowMeetingModal(false)}
                style={{
                  flex: 1,
                  background: "#aaa",
                  color: "white",
                  padding: 8,
                  border: "none",
                  borderRadius: 6,
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}