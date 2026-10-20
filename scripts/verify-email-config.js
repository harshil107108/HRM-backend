const dotenv = require("dotenv");
dotenv.config();
const { resolveSmtpConfig, sendOfferLetterEmail } = require("../utils/emailService");
const nodemailer = require("nodemailer");

async function testConnection() {
    console.log("=== Testing SMTP Connection ===");
    const config = await resolveSmtpConfig();
    console.log("Config Host:", config.host);
    console.log("Config Port:", config.port);
    console.log("Config User:", config.auth?.user || "Not configured");
    console.log("Config Pass:", config.auth?.pass ? "********" : "Not configured");
    console.log("Is Live Configured:", config.isConfigured);

    if (!config.isConfigured || !config.auth?.user || !config.auth?.pass) {
        console.log("\n❌ Status: No live SMTP credentials found in .env or SystemSetting.");
        console.log("👉 Please add SMTP_USER and SMTP_PASS (Google App Password) to your HRM-backend/.env file.");
        process.exit(1);
    }

    try {
        const transporter = nodemailer.createTransport({
            service: config.host?.includes("gmail.com") ? "gmail" : undefined,
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.auth,
        });

        console.log("\nVerifying connection with mail server...");
        await transporter.verify();
        console.log("✅ Success! Connected to mail server successfully. Live emails can now be delivered!");
    } catch (err) {
        console.error("❌ Connection failed:", err.message);
    }
}

testConnection();
