const SystemSetting = require("../../modals/Settings/SystemSettingModel");

module.exports.getSettingsByCategory = async (req, res) => {
    try {
        const { category = "General" } = req.body;
        let setting = await SystemSetting.findOne({ category });

        if (!setting) {
            // Default settings structure
            const defaults = {
                General: { companyName: "Orvexa Enterprise", timezone: "Asia/Kolkata", fiscalYear: "April - March", currency: "INR (₹)", dateFormat: "DD/MM/YYYY" },
                Notifications: { emailAlerts: true, leaveNotifications: true, attendanceAlerts: true, payslipAlerts: true, announcementSound: false },
                Email: { smtpHost: "smtp.office365.com", smtpPort: 587, senderEmail: "hrm@orvexa.io", senderName: "Orvexa HRM System", enableSsl: true },
                Integrations: { slackWebhook: "https://hooks.slack.com/services/orvexa", biometricApiUrl: "http://192.168.1.50:8080/cams", googleCalendarSync: true },
                Security: { sessionTimeoutMinutes: 60, twoFactorAuth: false, passwordMinLength: 8, ipWhitelisting: false, maxLoginAttempts: 5 }
            };
            setting = await SystemSetting.create({
                category,
                settings: defaults[category] || {},
            });
        }

        res.status(200).json({
            success: true,
            data: setting,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.updateSettingsByCategory = async (req, res) => {
    try {
        const { category, settings } = req.body;

        const updated = await SystemSetting.findOneAndUpdate(
            { category },
            { category, settings },
            { new: true, upsert: true }
        );

        res.status(200).json({
            success: true,
            message: `${category} settings saved successfully`,
            data: updated,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
