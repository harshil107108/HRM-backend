const mongoose = require("mongoose");

const attendanceLogSchema = new mongoose.Schema(
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
        clockIn: {
            type: String,
            default: "09:00",
        },
        clockOut: {
            type: String,
            default: "18:00",
        },
        totalHours: {
            type: Number,
            default: 8.5,
        },
        status: {
            type: String,
            enum: ["Present", "Absent", "Half Day", "Late", "On Leave", "Holiday", "Weekly Off"],
            default: "Present",
        },
        source: {
            type: String,
            enum: ["Web", "Biometric", "Mobile", "Manual Regularization"],
            default: "Web",
        },
        remarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

// Listing sorts by date (newest first) with `_id` as the paging tiebreaker,
// and the add/edit duplicate check looks up (employee, date).
attendanceLogSchema.index({ date: -1, _id: 1 });
attendanceLogSchema.index({ employeeId: 1, date: 1 });

module.exports = mongoose.model("AttendanceLog", attendanceLogSchema);
