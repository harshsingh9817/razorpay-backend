const crypto = require("crypto");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { orderId, paymentId, signature } = req.body;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!orderId || !paymentId || !signature) {
        return res.status(400).json({ error: "Missing required parameters" });
    }

    const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(orderId + "|" + paymentId)
        .digest("hex");

    if (generatedSignature === signature) {
        res.status(200).json({ status: "success", valid: true });
    } else {
        res.status(400).json({ status: "error", message: "Signature verification failed" });
    }
};
