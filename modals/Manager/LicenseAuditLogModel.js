const mongoose = require("mongoose");

const licenseAuditLogSchema = new mongoose.Schema(
    {
        licenseKey: {
            type: String,
            required: true,
            index: true,
        },
        action: {
            type: String,
            required: true,
            enum: [
                "GENERATED",
                "ACTIVATED",
                "HEARTBEAT",
                "QUOTA_CHECK",
                "QUOTA_EXCEEDED",
                "EXPIRED",
                "GRACE_PERIOD_ENTERED",
                "SOFT_LOCKED",
                "HARD_LOCKED",
                "SUSPENDED",
                "REACTIVATED",
                "EXTENDED",
                "REVOKED",
                "TAMPER_DETECTED",
                "CLOCK_ROLLBACK_DETECTED",
            ],
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
            default: "",
        },
        performedBy: {
            type: String,
            default: "SYSTEM",
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LicenseAuditLog", licenseAuditLogSchema);

