module.exports = async (req, res) => {
    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    res.status(200).json({
        message: "Environment variable check",
        RAZORPAY_KEY_ID: {
            exists: !!keyId,
            length: keyId.length,
            prefix: keyId.substring(0, 10),
            suffix: keyId.substring(keyId.length - 4)
        },
        RAZORPAY_KEY_SECRET: {
            exists: !!keySecret,
            length: keySecret.length,
            prefix: keySecret.substring(0, 4) + "****",
            suffix: "****" + keySecret.substring(keySecret.length - 4)
        },
        node_version: process.version,
        env: process.env.VERCEL_ENV || "unknown"
    });
};
