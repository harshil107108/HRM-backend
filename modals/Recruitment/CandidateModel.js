const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
    {
        candidateName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
        },
        jobOpening: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JobOpening",
            required: true,
        },
        currentCompany: {
            type: String,
            default: "",
            trim: true,
        },
        currentDesignation: {
            type: String,
            default: "",
            trim: true,
        },
        totalExperienceYears: {
            type: Number,
            default: 0,
        },
        currentSalary: {
            type: Number,
            default: 0,
        },
        expectedSalary: {
            type: Number,
            default: 0,
        },
        noticePeriodDays: {
            type: Number,
            default: 30,
        },
        resumeUrl: {
            type: String,
            default: "",
        },
        stage: {
            type: String,
            enum: ["Applied", "Screening", "Interview", "Offered", "Hired", "Rejected"],
            default: "Applied",
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 3,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Candidate", candidateSchema);
