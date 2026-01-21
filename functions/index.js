const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

try {
  admin.initializeApp();
} catch (e) {
  // Avoid double-init in local emulators/tests
}

function getMailer() {
  // Prefer Firebase Functions config, fallback to env vars
  const cfg = functions.config && typeof functions.config === "function" ? functions.config() : {};
  const gmailUser = (cfg.gmail && cfg.gmail.user) || process.env.GMAIL_USER;
  const gmailPass = (cfg.gmail && cfg.gmail.pass) || process.env.GMAIL_PASS;

  if (!gmailUser || !gmailPass) {
    throw new Error("Missing Gmail credentials for Nodemailer (gmail.user/gmail.pass or GMAIL_USER/GMAIL_PASS).");
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass
    }
  });
}

exports.sendContactEmail = functions.https.onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "Method Not Allowed" });
      return;
    }

    const body = req.body || {};
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const timestamp = body.timestamp ? String(body.timestamp) : new Date().toISOString();

    if (!name || !email || !message) {
      res.status(400).json({ ok: false, error: "Missing required fields" });
      return;
    }

    const cfg = functions.config && typeof functions.config === "function" ? functions.config() : {};
    const owner = (cfg.owner && cfg.owner.email) || process.env.OWNER_EMAIL;
    if (!owner) {
      throw new Error("Missing owner email (owner.email or OWNER_EMAIL).");
    }

    const transporter = getMailer();

    const subject = `Finance Clarity — New Contact Message`;
    const text =
      `You received a new message from Finance Clarity:\n\n` +
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Timestamp: ${timestamp}\n\n` +
      `Message:\n${message}\n`;

    await transporter.sendMail({
      from: `"Finance Clarity" <${(functions.config().gmail && functions.config().gmail.user) || process.env.GMAIL_USER}>`,
      to: owner,
      replyTo: email,
      subject,
      text
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error("sendContactEmail failed:", e);
    res.status(500).json({ ok: false, error: "Email send failed" });
  }
});

