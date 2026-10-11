const mongoose = require("mongoose");

const leaveRequestSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        leaveType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LeaveType",
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        totalDays: {
            type: Number,
            required: true,
            default: 1,
        },
        isHalfDay: {
            type: Boolean,
            default: false,
        },
        reason: {
            type: String,
            required: true,
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Cancelled"],
            default: "Pending",
        },
        approverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
        },
        approverRemarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LeaveRequest", leaveRequestSchema);
