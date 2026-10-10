const mongoose = require("mongoose");

const leaveBalanceSchema = new mongoose.Schema(
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
        year: {
            type: Number,
            default: () => new Date().getFullYear(),
        },
        totalAllocated: {
            type: Number,
            required: true,
            default: 12,
        },
        usedDays: {
            type: Number,
            default: 0,
        },
        pendingDays: {
            type: Number,
            default: 0,
        },
        balanceDays: {
            type: Number,
            default: 12,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LeaveBalance", leaveBalanceSchema);
