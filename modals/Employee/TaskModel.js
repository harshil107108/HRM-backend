const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 4000,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeProject",
            default: null,
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        dueDate: {
            type: Date,
            default: null,
        },
        dueTime: {
            type: String,
            default: "",
            trim: true,
        },
        estimatedHours: {
            type: Number,
            default: null,
            min: 0,
        },
        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["Assigned", "Running", "Code Review", "Completed"],
            default: "Assigned",
        },
        statusUpdatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },
        startedAt: {
            type: Date,
            default: null,
        },
        runningStartedAt: {
            type: Date,
            default: null,
        },
        totalWorkedMs: {
            type: Number,
            default: 0,
            min: 0,
        },
        completedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
);

module.exports = mongoose.model("EmployeeTask", taskSchema);
