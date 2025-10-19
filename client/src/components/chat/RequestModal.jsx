import React, { useState } from "react";
import axios from "axios";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const RequestModal = ({ peer, currentUser, onClose, onRequested }) => {
  const [loading, setLoading] = useState(false);

  const sendRequest = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/session/request`, { requester_id: currentUser.id, receiver_id: peer.id });
      onRequested && onRequested();
    } catch (err) {
      console.error(err);
      alert("Failed to send request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, top: 0, bottom: 0,
      background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", padding: 20, width: 420, borderRadius: 8 }}>
        <h3>Request chat with {peer.name}</h3>
        <p>Send a request to start a one-on-one chat.</p>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button onClick={sendRequest} disabled={loading}>{loading ? "Sending..." : "Send Request"}</button>
        </div>
      </div>
    </div>
  );
};

export default RequestModal;