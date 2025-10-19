const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const privateKey = fs.readFileSync(
  path.join(__dirname, "../keys/jaasauth.key"),
  "utf8"
);

// From JaaS account
const appId = "vpaas-magic-cookie-758b59a977c9450baefe97406b3422e6";
const kid = "vpaas-magic-cookie-758b59a977c9450baefe97406b3422e6/986689";

router.post("/token", (req, res) => {
  const { roomName, user } = req.body;

  try {
    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName,
      context: {
        user: {
          id: user?.id,
          name: user?.name || "Guest",
          email: user?.email || "",
          avatar: user?.avatar,
        },
        features: {
          livestreaming: true,
          recording: true,
          transcription: true,
        },
      },
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
      keyid: kid,
      expiresIn: "1h",
    });

    res.json({
      success: true,
      token,
      room: `${appId}/${roomName}`, 
    });
  } catch (err) {
    console.error("JWT generation failed:", err);
    res.status(500).json({ success: false, error: "Failed to generate token" });
  }
});

module.exports = router;
