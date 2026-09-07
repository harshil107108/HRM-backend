const mongoose = require("mongoose");

const jobOpeningSchema = new mongoose.Schema(
    {
        // =========================================================
        // JOB INFORMATION
        // =========================================================

        jobTitle: {
            type: String,
            required: true,
            trim: true,
        },

        jobOpeningId: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            required: true,
        },

        designation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DesignationMaster",
            required: true,
        },

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyMaster",
            required: true,
        },

        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BranchMaster",
            default: null,
        },

        // =========================================================
        // POSITION INFORMATION
        // =========================================================

        numberOfPositions: {
            type: Number,
            required: true,
            min: 1,
        },

        employmentType: {
            type: String,
            required: true,
            enum: [
                "FULL_TIME",
                "PART_TIME",
                "CONTRACT",
                "INTERNSHIP",
                "TEMPORARY",
            ],
        },

        workMode: {
            type: String,
            required: true,
            enum: [
                "ONSITE",
                "HYBRID",
                "REMOTE",
            ],
        },

        experienceRequired: {
            type: String,
            enum: [
                "FRESHER",
                "ENTRY_LEVEL",
                "MID_LEVEL",
                "SENIOR_LEVEL",
                "LEAD",
            ],
            default: "",
        },

        minimumExperience: {
            type: Number,
            min: 0,
            default: 0,
        },

        maximumExperience: {
            type: Number,
            min: 0,
            default: 0,
        },

        // =========================================================
        // HIRING INFORMATION
        // =========================================================

        hiringManager: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
        },

        recruiter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        priority: {
            type: String,
            enum: [
                "LOW",
                "NORMAL",
                "HIGH",
                "URGENT",
            ],
            default: "NORMAL",
        },

        targetJoiningDate: {
            type: Date,
            default: null,
        },

        // =========================================================
        // SALARY INFORMATION
        // =========================================================

        salaryType: {
            type: String,
            enum: [
                "ANNUAL_CTC",
                "MONTHLY",
                "HOURLY",
                "NEGOTIABLE",
            ],
            default: "",
        },

        minimumSalary: {
            type: Number,
            min: 0,
            default: 0,
        },

        maximumSalary: {
            type: Number,
            min: 0,
            default: 0,
        },

        currency: {
            type: String,
            enum: [
                "INR",
                "USD",
                "EUR",
                "GBP",
            ],
            default: "INR",
        },

        // =========================================================
        // JOB DESCRIPTION
        // =========================================================

        jobSummary: {
            type: String,
            required: true,
            trim: true,
        },

        jobResponsibilities: {
            type: String,
            required: true,
            trim: true,
        },

        requiredSkills: {
            type: String,
            trim: true,
            default: "",
        },

        preferredSkills: {
            type: String,
            trim: true,
            default: "",
        },

        qualifications: {
            type: String,
            trim: true,
            default: "",
        },

        // =========================================================
        // PUBLISHING INFORMATION
        // =========================================================

        jobStatus: {
            type: String,
            required: true,
            enum: [
                "DRAFT",
                "ACTIVE",
                "ON_HOLD",
                "CLOSED",
                "FILLED",
            ],
            default: "DRAFT",
        },

        publishDate: {
            type: Date,
            default: null,
        },

        closingDate: {
            type: Date,
            default: null,
        },

        publishOnCareerPage: {
            type: Boolean,
            default: false,
        },

        allowInternalApplications: {
            type: Boolean,
            default: false,
        },

        // =========================================================
        // ADDITIONAL INFORMATION
        // =========================================================

        remarks: {
            type: String,
            trim: true,
            default: "",
        },

        // =========================================================
        // SYSTEM
        // =========================================================

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Job Opening ID must be unique
jobOpeningSchema.index(
    { jobOpeningId: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "JobOpening",
    jobOpeningSchema
);