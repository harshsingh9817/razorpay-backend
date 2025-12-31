const Razorpay = require("razorpay");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
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
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Unable to create order", details: error.message });
    }
};
