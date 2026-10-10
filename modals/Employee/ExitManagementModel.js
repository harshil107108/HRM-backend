const mongoose = require("mongoose");

const exitManagementSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        resignationDate: {
            type: Date,
            required: true,
        },
        noticePeriodDays: {
            type: Number,
            default: 30,
        },
        lastWorkingDate: {
            type: Date,
            required: true,
        },
        exitReason: {
            type: String,
            required: true,
            trim: true,
        },
        exitType: {
            type: String,
            enum: ["Resignation", "Retirement", "Termination", "Contract End", "Other"],
            default: "Resignation",
        },
        departmentClearance: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        itClearance: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        financeClearance: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        hrClearance: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        overallStatus: {
            type: String,
            enum: ["Submitted", "In Clearance", "Approved", "Completed", "Rejected"],
            default: "Submitted",
        },
        fnfStatus: {
            type: String,
            enum: ["Pending", "Calculated", "Settled"],
            default: "Pending",
        },
        interviewFeedback: {
            type: String,
            default: "",
            trim: true,
        },
        remarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ExitManagement", exitManagementSchema);
