const mongoose = require("mongoose");

const alternateRuleSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            required: true,
            enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        },
        pattern: {
            type: String,
            required: true,
            enum: ["2nd & 4th", "1st & 3rd", "1st, 3rd & 5th", "All"],
            default: "2nd & 4th",
        },
    },
    { _id: false }
);

const weekendPolicySchema = new mongoose.Schema(
    {
        policyName: {
            type: String,
            required: true,
            trim: true,
        },
        policyCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        // Base full weekly off days, e.g. ["Sunday", "Friday"]
        days: {
            type: [String],
            default: ["Sunday"],
        },
        weeklyOffDays: {
            type: [String],
            default: ["Sunday"],
        },
        // Array of flexible alternate rules: e.g. [{ day: "Tuesday", pattern: "2nd & 4th" }]
        alternateRules: {
            type: [alternateRuleSchema],
            default: [],
        },
        // Primary alternate rule fields
        alternateDay: {
            type: String,
            default: "None",
        },
        alternatePattern: {
            type: String,
            default: "2nd & 4th",
        },
        alternateSaturdayRule: {
            type: String,
            default: "None",
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
        applicableBranches: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "BranchMaster",
            },
        ],
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

module.exports = mongoose.model("WeekendPolicy", weekendPolicySchema);
