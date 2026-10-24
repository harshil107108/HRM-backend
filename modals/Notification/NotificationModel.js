const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeMaster",
        required: true,
        index: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeMaster",
    },
    type: {
        type: String,
        enum: ["TASK_ASSIGNED", "TASK_STATUS_UPDATED", "GENERAL"],
        default: "TASK_ASSIGNED",
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    metadata: {
        taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
        priority: { type: String, default: "Medium" },
        dueDate: { type: Date },
    },
    isRead: {
        type: Boolean,
        default: false,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true,
        expires: 86400, // MongoDB TTL: deletes document 24 hours (1 day) after creation
    },
});

// Explicit TTL Index to ensure MongoDB removes expired notifications automatically
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Notification", NotificationSchema);
