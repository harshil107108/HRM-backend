const mongoose = require("mongoose");

const appraisalSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        reviewCycle: {
            type: String,
            required: true,
            default: "FY 2025-2026",
        },
        currentSalary: {
            type: Number,
            required: true,
        },
        recommendedIncrementPercentage: {
            type: Number,
            required: true,
            default: 12,
        },
        revisedSalary: {
            type: Number,
            required: true,
        },
        promotionRecommended: {
            type: Boolean,
            default: false,
        },
        proposedDesignation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DesignationMaster",
        },
        effectiveDate: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Draft", "Recommended", "Under HR Review", "Approved", "Rejected"],
            default: "Recommended",
        },
        remarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Appraisal", appraisalSchema);
