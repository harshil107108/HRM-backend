const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        reviewPeriod: {
            type: String,
            required: true,
            default: "Annual Review 2025-2026",
        },
        selfRating: {
            type: Number,
            min: 1,
            max: 5,
            default: 4,
        },
        managerRating: {
            type: Number,
            min: 1,
            max: 5,
            default: 4,
        },
        finalRating: {
            type: Number,
            min: 1,
            max: 5,
            default: 4,
        },
        strengths: {
            type: String,
            default: "",
            trim: true,
        },
        improvements: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["Draft", "Self Review Submitted", "Manager Review Completed", "Finalized"],
            default: "Self Review Submitted",
        },
        reviewDate: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
