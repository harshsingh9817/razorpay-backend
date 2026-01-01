const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: (process.env.RAZORPAY_KEY_ID || "").trim(),
    key_secret: (process.env.RAZORPAY_KEY_SECRET || "").trim(),
});

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { amount, currency = "INR", receipt } = req.body;

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
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("Razorpay Order Creation Error:", error);
        res.status(500).json({
            error: "Unable to create order",
            message: error.message,
            razorpay_error: error,
            debug_info: {
                has_id: !!process.env.RAZORPAY_KEY_ID,
                has_secret: !!process.env.RAZORPAY_KEY_SECRET,
                id_length: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.length : 0,
                secret_length: process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.length : 0,
                id_prefix: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.substring(0, 10) : "none"
            }
        });
    }
};
