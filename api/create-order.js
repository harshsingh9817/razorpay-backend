module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { amount, currency = "INR", receipt, mode = "test" } = req.body;

    // Dynamically select keys based on mode
    let key_id, key_secret;
    if (mode === "live") {
        key_id = (process.env.RAZORPAY_KEY_ID_LIVE || "").trim();
        key_secret = (process.env.RAZORPAY_KEY_SECRET_LIVE || "").trim();
    } else {
        key_id = (process.env.RAZORPAY_KEY_ID_TEST || "").trim();
        key_secret = (process.env.RAZORPAY_KEY_SECRET_TEST || "").trim();
    }

    const razorpay = new Razorpay({
        key_id: key_id,
        key_secret: key_secret,
    });

    if (!amount) {
        return res.status(400).json({ error: "Amount is required" });
    }

    try {
        const order = await razorpay.orders.create({
            amount: amount,
            currency: currency,
            receipt: receipt,
        });

        res.status(200).json({
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            key_id: key_id,
        });
    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        res.status(500).json({
            error: "Unable to create order",
            message: error.message,
            razorpay_error: error,
            debug_info: {
                has_id: !!key_id,
                has_secret: !!key_secret,
                id_length: key_id.length,
                secret_length: key_secret.length,
                id_prefix: key_id.substring(0, 10),
                mode: mode,
                env_type: process.env.VERCEL_ENV || "unknown"
            }
        });
    }
};
