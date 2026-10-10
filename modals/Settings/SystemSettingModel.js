const mongoose = require("mongoose");

const systemSettingSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            required: true,
            enum: ["General", "Notifications", "Email", "Integrations", "Security"],
            default: "General",
        },
        settings: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("SystemSetting", systemSettingSchema);
