const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const router = express.Router();

const privateKeyPath = "/etc/secrets/jaasauth.key";
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const appId = "vpaas-magic-cookie-e7456b2aca5e40f1874f1b2aecd1b3b0";
const kid = "vpaas-magic-cookie-e7456b2aca5e40f1874f1b2aecd1b3b0/110f8f";

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
