const express = require("express");
const crypto = require("crypto");
const admin = require("firebase-admin");
const Razorpay = require("razorpay");

// ─── Firebase Admin Init (graceful) ────────────────────────────────
let db = null;
let firebaseReady = false;
try {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  if (rawServiceAccount && rawServiceAccount !== "{}") {
    const serviceAccount = JSON.parse(rawServiceAccount);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    db = admin.firestore();
    firebaseReady = true;
    console.log("✅ Firebase Admin initialized successfully");
  } else {
    console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT not set — Firebase features disabled");
  }
} catch (err) {
  console.error("❌ Firebase init failed:", err.message);
}

// ─── Razorpay Init (graceful) ──────────────────────────────────────
let razorpay = null;
let razorpayReady = false;
const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

try {
  if (razorpayKeyId && razorpayKeySecret) {
    razorpay = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
    razorpayReady = true;
    console.log("✅ Razorpay initialized successfully");
  } else {
    console.warn("⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set — Razorpay features disabled");
  }
} catch (err) {
  console.error("❌ Razorpay init failed:", err.message);
}

// ─── Express App ───────────────────────────────────────────────────
const app = express();

// Webhook needs raw body for signature verification
app.use("/api/razorpay-webhook", express.raw({ type: "application/json" }));
app.use(express.json());

// ─── Health Check (JSON API) ───────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      firebase: firebaseReady ? "connected" : "not configured",
      razorpay: razorpayReady ? "connected" : "not configured",
      webhook: webhookSecret ? "configured" : "not configured",
    },
  });
});

// ─── Status Dashboard (Web Page) ───────────────────────────────────
app.get("/", (req, res) => {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);
  const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rasoi Xpress — Server Status</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .bg-glow {
      position: fixed;
      width: 600px; height: 600px;
      border-radius: 50%;
      filter: blur(120px);
      opacity: 0.15;
      pointer-events: none;
    }
    .glow-1 { background: #ff5722; top: -200px; left: -100px; }
    .glow-2 { background: #ff9800; bottom: -200px; right: -100px; }
    .container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 480px;
      padding: 20px;
    }
    .card {
      background: rgba(255,255,255,0.04);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 24px;
      padding: 40px 32px;
      text-align: center;
    }
    .logo {
      font-size: 42px;
      margin-bottom: 8px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #ff5722, #ff9800);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 4px;
    }
    .subtitle {
      color: rgba(255,255,255,0.4);
      font-size: 13px;
      margin-bottom: 32px;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border-radius: 100px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 32px;
    }
    .status-online {
      background: rgba(34,197,94,0.12);
      color: #22c55e;
      border: 1px solid rgba(34,197,94,0.2);
    }
    .pulse-dot {
      width: 10px; height: 10px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }
    .stats {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 32px;
    }
    .stat {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 16px;
      padding: 16px 12px;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: #ff9800;
      margin-bottom: 4px;
    }
    .stat-label {
      font-size: 11px;
      color: rgba(255,255,255,0.35);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .ping-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      background: linear-gradient(135deg, #ff5722, #ff9800);
      color: #fff;
      transition: all 0.3s ease;
      margin-bottom: 12px;
    }
    .ping-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(255,87,34,0.3); }
    .ping-btn:active { transform: translateY(0); }
    .ping-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .ping-result {
      min-height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      color: rgba(255,255,255,0.5);
      border-radius: 12px;
      padding: 10px;
      transition: all 0.3s ease;
    }
    .ping-ok { background: rgba(34,197,94,0.08); color: #22c55e; }
    .ping-fail { background: rgba(239,68,68,0.08); color: #ef4444; }
    .footer {
      margin-top: 24px;
      font-size: 11px;
      color: rgba(255,255,255,0.2);
    }
  </style>
</head>
<body>
  <div class="bg-glow glow-1"></div>
  <div class="bg-glow glow-2"></div>
  <div class="container">
    <div class="card">
      <div class="logo">🍛</div>
      <div class="title">Rasoi Xpress</div>
      <div class="subtitle">Payment Server — Render</div>

      <div class="status-badge status-online">
        <div class="pulse-dot"></div>
        Server Online
      </div>

      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:24px;flex-wrap:wrap">
        <span style="padding:6px 14px;border-radius:100px;font-size:12px;font-weight:600;${firebaseReady ? 'background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.2)' : 'background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.2)'}">${firebaseReady ? '✅' : '❌'} Firebase</span>
        <span style="padding:6px 14px;border-radius:100px;font-size:12px;font-weight:600;${razorpayReady ? 'background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.2)' : 'background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.2)'}">${razorpayReady ? '✅' : '❌'} Razorpay</span>
        <span style="padding:6px 14px;border-radius:100px;font-size:12px;font-weight:600;${webhookSecret ? 'background:rgba(34,197,94,0.12);color:#22c55e;border:1px solid rgba(34,197,94,0.2)' : 'background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.2)'}">${webhookSecret ? '✅' : '❌'} Webhook</span>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-value" id="uptime">${uptimeStr}</div>
          <div class="stat-label">Uptime</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="pingMs">—</div>
          <div class="stat-label">Ping</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="lastPing">Never</div>
          <div class="stat-label">Last Ping</div>
        </div>
        <div class="stat">
          <div class="stat-value" id="pingCount">0</div>
          <div class="stat-label">Total Pings</div>
        </div>
      </div>

      <button class="ping-btn" id="pingBtn" onclick="doPing()">🏓 Ping Server</button>
      <div class="ping-result" id="pingResult">Click the button to ping</div>

      <div class="footer">Keep-alive pings every 14 min · Powered by Node.js + Express</div>
    </div>
  </div>

  <script>
    let pingCount = 0;

    async function doPing() {
      const btn = document.getElementById('pingBtn');
      const result = document.getElementById('pingResult');
      btn.disabled = true;
      btn.textContent = '⏳ Pinging...';
      result.className = 'ping-result';
      result.textContent = 'Sending ping...';

      const start = performance.now();
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        const ms = Math.round(performance.now() - start);

        pingCount++;
        document.getElementById('pingMs').textContent = ms + 'ms';
        document.getElementById('lastPing').textContent = new Date().toLocaleTimeString();
        document.getElementById('pingCount').textContent = pingCount;

        // Update uptime from server response
        const up = data.uptime;
        const h = Math.floor(up / 3600);
        const m = Math.floor((up % 3600) / 60);
        const s = Math.floor(up % 60);
        document.getElementById('uptime').textContent = h + 'h ' + m + 'm ' + s + 's';

        result.className = 'ping-result ping-ok';
        result.textContent = '✅ Server responded in ' + ms + 'ms — Status: ' + data.status;
      } catch (err) {
        result.className = 'ping-result ping-fail';
        result.textContent = '❌ Ping failed: ' + err.message;
      }
      btn.disabled = false;
      btn.textContent = '🏓 Ping Server';
    }

    // Auto-update uptime every second
    let serverUptime = ${uptime};
    setInterval(() => {
      serverUptime++;
      const h = Math.floor(serverUptime / 3600);
      const m = Math.floor((serverUptime % 3600) / 60);
      const s = Math.floor(serverUptime % 60);
      document.getElementById('uptime').textContent = h + 'h ' + m + 'm ' + s + 's';
    }, 1000);
  </script>
</body>
</html>`);
});

// ─── Create Order ──────────────────────────────────────────────────
app.post("/api/create-order", async (req, res) => {
  try {
    if (!firebaseReady || !razorpayReady) {
      return res.status(503).json({ error: "Server not fully configured. Missing Firebase or Razorpay credentials." });
    }

    const { amount, firestoreOrderId } = req.body;

    if (!amount || !firestoreOrderId) {
      return res.status(400).json({ error: "amount and firestoreOrderId are required" });
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: firestoreOrderId,
      notes: {
        firestoreOrderId: firestoreOrderId,
      },
    });

    // Store the razorpayOrderId in Firestore so webhook can map it back
    await db.collection("orders").doc(firestoreOrderId).update({
      razorpayOrderId: order.id,
    });

    res.status(200).json({
      razorpayOrderId: order.id,
      keyId: razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("❌ Create Order Error:", error);
    res.status(500).json({ error: "Failed to create order", message: error.message });
  }
});

// ─── Razorpay Webhook ──────────────────────────────────────────────
app.post("/api/razorpay-webhook", async (req, res) => {
  try {
    if (!firebaseReady) {
      console.error("❌ Webhook received but Firebase not configured");
      return res.status(200).json({ status: "ok", warning: "Firebase not configured" });
    }

    const rawBody = req.body.toString("utf8");
    const receivedSignature = req.headers["x-razorpay-signature"];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    if (expectedSignature !== receivedSignature) {
      console.error("❌ Webhook signature mismatch");
      return res.status(400).json({ error: "Invalid signature" });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;

    console.log(`📩 Webhook received: ${eventType}`);

    if (eventType === "payment.captured") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      // Find the Firestore order by razorpayOrderId
      const ordersSnapshot = await db
        .collection("orders")
        .where("razorpayOrderId", "==", razorpayOrderId)
        .limit(1)
        .get();

      if (ordersSnapshot.empty) {
        // Fallback: check receipt in notes
        const firestoreOrderId = event.payload.payment.entity.notes?.firestoreOrderId;
        if (firestoreOrderId) {
          await db.collection("orders").doc(firestoreOrderId).update({
            status: "Order Placed",
            razorpayPaymentId: razorpayPaymentId,
            razorpayOrderId: razorpayOrderId,
            paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentVerifiedBy: "webhook",
          });
          console.log(`✅ Order ${firestoreOrderId} updated via notes fallback`);
        } else {
          console.error(`❌ No Firestore order found for Razorpay order: ${razorpayOrderId}`);
        }
      } else {
        const orderDoc = ordersSnapshot.docs[0];
        await orderDoc.ref.update({
          status: "Order Placed",
          razorpayPaymentId: razorpayPaymentId,
          paymentVerifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          paymentVerifiedBy: "webhook",
        });
        console.log(`✅ Order ${orderDoc.id} marked as "Order Placed"`);
      }
    } else if (eventType === "payment.failed") {
      const payment = event.payload.payment.entity;
      const razorpayOrderId = payment.order_id;

      const ordersSnapshot = await db
        .collection("orders")
        .where("razorpayOrderId", "==", razorpayOrderId)
        .limit(1)
        .get();

      if (!ordersSnapshot.empty) {
        const orderDoc = ordersSnapshot.docs[0];
        const currentStatus = orderDoc.data().status;
        // Don't override if already "Order Placed" (payment was captured before failure event)
        if (currentStatus !== "Order Placed") {
          await orderDoc.ref.update({
            status: "Payment Failed",
            paymentFailedAt: admin.firestore.FieldValue.serverTimestamp(),
            razorpayErrorDescription: payment.error_description || "Payment failed",
          });
          console.log(`❌ Order ${orderDoc.id} marked as "Payment Failed"`);
        }
      }
    }

    // Always respond 200 to Razorpay (they retry on non-2xx)
    res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    // Still respond 200 to prevent retries on processing errors
    res.status(200).json({ status: "ok" });
  }
});

// ─── Keep-Alive Self Ping ──────────────────────────────────────────
const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "";
if (RENDER_URL) {
  // Ping every 14 minutes (Render free tier sleeps after 15 min inactivity)
  setInterval(async () => {
    try {
      const response = await fetch(`${RENDER_URL}/api/health`);
      console.log(`🏓 Keep-alive ping: ${response.status} at ${new Date().toISOString()}`);
    } catch (err) {
      console.error("🏓 Keep-alive ping failed:", err.message);
    }
  }, 14 * 60 * 1000); // 14 minutes
}

// ─── Start Server ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Rasoi Xpress server running on port ${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  if (RENDER_URL) {
    console.log(`🌐 External URL: ${RENDER_URL}`);
    console.log(`🏓 Keep-alive enabled (every 14 min)`);
  }
});
