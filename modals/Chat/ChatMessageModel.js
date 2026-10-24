const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
            index: true,
        },
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
            index: true,
        },
        message: {
            type: String,
            required: true,
            trim: true,
        },
        messageType: {
            type: String,
            enum: ["text", "image", "file"],
            default: "text",
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
            default: null,
        },
        createdAt: {
            type: Date,
            default: Date.now,
            index: true,
            expires: 86400, // MongoDB TTL: deletes message 24 hours (86,400s) after creation
        },
    },
    {
        timestamps: true,
    }
);

// Explicit TTL Index to ensure MongoDB automatically deletes chat messages older than 24 hours
chatMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

chatMessageSchema.index({ sender: 1, recipient: 1, createdAt: 1 });
chatMessageSchema.index({ recipient: 1, isRead: 1 });
chatMessageSchema.index({ recipient: 1, sender: 1, isRead: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
