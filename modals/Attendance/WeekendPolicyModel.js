const mongoose = require("mongoose");

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
        weeklyOffDays: {
            type: [String],
            default: ["Sunday"],
        },
        // Fields sent by the frontend Weekend Policy form
        days: {
            type: [String],
            default: ["Sunday"],
        },
        status: {
            type: String,
            enum: ["Active", "Inactive"],
            default: "Active",
        },
        alternateSaturdayRule: {
            type: String,
            enum: ["None", "All Saturdays Off", "2nd & 4th Saturday Off", "1st & 3rd Saturday Off"],
            default: "2nd & 4th Saturday Off",
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
