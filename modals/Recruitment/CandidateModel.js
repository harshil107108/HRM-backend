const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        middleName: {
            type: String,
            default: "",
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        candidateName: {
            type: String,
            default: "",
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
        rejectionReason: {
            type: String,
            default: "",
            trim: true,
        },
        convertedEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

// Mongoose 9 no longer passes `next` to middleware; a sync hook just returns.
candidateSchema.pre("validate", function () {
    if (this.firstName || this.lastName) {
        this.candidateName = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(" ");
    } else if (this.candidateName && (!this.firstName || !this.lastName)) {
        const parts = this.candidateName.trim().split(/\s+/);
        this.firstName = parts[0] || "Candidate";
        this.middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
        this.lastName = parts.length > 1 ? parts[parts.length - 1] : "Candidate";
    }
});

module.exports = mongoose.model("Candidate", candidateSchema);
