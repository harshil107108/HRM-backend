const mongoose = require("mongoose");

const onboardingSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Candidate",
            required: true,
        },
        jobOpening: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JobOpening",
        },
        buddyEmployee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
        },
        orientationDate: {
            type: Date,
            required: true,
        },
        documentsSubmitted: {
            type: Boolean,
            default: false,
        },
        backgroundCheckCompleted: {
            type: Boolean,
            default: false,
        },
        itAssetsAssigned: {
            type: Boolean,
            default: false,
        },
        bankDetailsVerified: {
            type: Boolean,
            default: false,
        },
        orientationCompleted: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Cancelled"],
            default: "In Progress",
        },
        progressPercentage: {
            type: Number,
            default: 20,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Onboarding", onboardingSchema);
