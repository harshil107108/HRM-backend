const mongoose = require("mongoose");

const leavePolicySchema = new mongoose.Schema(
    {
        policyName: {
            type: String,
            required: true,
            trim: true,
        },
        leaveType: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LeaveType",
            required: true,
        },
        accrualFrequency: {
            type: String,
            enum: ["Monthly", "Quarterly", "Yearly", "On Joining"],
            default: "Monthly",
        },
        maxConsecutiveDays: {
            type: Number,
            default: 10,
        },
        allowCarryForward: {
            type: Boolean,
            default: true,
        },
        maxCarryForwardDays: {
            type: Number,
            default: 15,
        },
        sandwichRuleEnabled: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("LeavePolicy", leavePolicySchema);
