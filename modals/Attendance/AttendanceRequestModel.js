const mongoose = require("mongoose");

const attendanceRequestSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        requestDate: {
            type: Date,
            required: true,
        },
        requestedClockIn: {
            type: String,
            required: true,
            default: "09:00",
        },
        requestedClockOut: {
            type: String,
            required: true,
            default: "18:00",
        },
        requestType: {
            type: String,
            enum: ["Missed Punch", "Work From Home", "On Duty", "Half Day Adjustment"],
            default: "Missed Punch",
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
        reviewerRemarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AttendanceRequest", attendanceRequestSchema);
