const mongoose = require("mongoose");

const designationMasterSchema = new mongoose.Schema(
    {
        // =========================
        // BASIC INFORMATION
        // =========================

        designationname: {
            type: String,
            required: true,
            trim: true,
        },

        designationcode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        shortname: {
            type: String,
            required: true,
            trim: true,
        },

        description: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // JOB ASSIGNMENT
        // =========================

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyMaster",
            required: true,
        },

        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BranchMaster",
            required: true,
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            required: true,
        },

        businessUnitId: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // EMPLOYMENT
        // =========================

        employmentType: {
            type: String,
            trim: true,
            default: "",
        },

        employmentStatus: {
            type: String,
            trim: true,
            default: "",
        },

        joiningDate: {
            type: Date,
            default: null,
        },

        confirmationDate: {
            type: Date,
            default: null,
        },

        probationPeriod: {
            type: String,
            trim: true,
            default: "",
        },

        noticePeriod: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // REPORTING STRUCTURE
        // =========================

        reportingManagerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        skipLevelManagerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        departmentHeadId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        mentorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },


        // =========================
        // GRADE
        // =========================

        jobGrade: {
            type: String,
            trim: true,
            default: "",
        },

        jobLevel: {
            type: String,
            trim: true,
            default: "",
        },

        band: {
            type: String,
            trim: true,
            default: "",
        },

        salaryGrade: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // WORK
        // =========================

        workingShift: {
            type: String,
            trim: true,
            default: "",
        },


        holidayCalendar: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "HolidayMaster",
            }
        ],

        weeklyOff: {
            type: [String],
            default: [],
        },

        attendancePolicy: {
            type: String,
            trim: true,
            default: "",
        },

        officialEmail: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },

        officialPhone: {
            type: String,
            trim: true,
            default: "",
        },

        extensionNumber: {
            type: String,
            trim: true,
            default: "",
        },

        workMode: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // PAYROLL
        // =========================

        // =========================
        // PAYROLL
        // =========================

        payrollGroup: {
            type: String,
            trim: true,
            default: "",
        },

        defaultRole: {
            type: String,
            trim: true,
            default: "",
        },

        accessLevel: {
            type: String,
            trim: true,
            default: "",
        },

        userAccount: {
            type: String,
            trim: true,
            default: "",
        },

        // =========================
        // PAYROLL TOGGLES
        // =========================

        overtimeEligible: {
            type: Boolean,
            default: true,
        },

        bonusEligible: {
            type: Boolean,
            default: true,
        },

        pfApplicable: {
            type: Boolean,
            default: true,
        },

        esiApplicable: {
            type: Boolean,
            default: false,
        },

        professionalTaxApplicable: {
            type: Boolean,
            default: true,
        },


        // =========================
        // STATUS
        // =========================

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);


// =========================
// UNIQUE DESIGNATION CODE
// =========================

designationMasterSchema.index(
    { designationcode: 1 },
    { unique: true }
);


module.exports = mongoose.model(
    "DesignationMaster",
    designationMasterSchema
);