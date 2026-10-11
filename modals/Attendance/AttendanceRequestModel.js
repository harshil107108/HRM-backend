const mongoose = require("mongoose");

const attendanceRequestSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        inTime: {
            type: String,
            default: "09:00",
        },
        outTime: {
            type: String,
            default: "18:00",
        },
        requestType: {
            type: String,
            enum: ["Regularization", "Manual Punch", "Overtime", "On Duty"],
            default: "Regularization",
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
        },
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AttendanceRequest", attendanceRequestSchema);
