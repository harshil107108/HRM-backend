const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
    {
        user: {
            type: String,
            default: "Admin User",
        },
        action: {
            type: String,
            required: true,
            enum: ["CREATE", "UPDATE", "DELETE", "LOGIN", "EXPORT", "APPROVE", "REJECT"],
            default: "UPDATE",
        },
        module: {
            type: String,
            required: true,
            trim: true,
        },
        recordId: {
            type: String,
            default: "",
        },
        ipAddress: {
            type: String,
            default: "127.0.0.1",
        },
        description: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
