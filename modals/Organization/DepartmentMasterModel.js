const mongoose = require("mongoose");

const departmentMasterSchema = new mongoose.Schema(
    {
        // =========================
        // BASIC INFORMATION
        // =========================

        departmentname: {
            type: String,
            required: true,
            trim: true,
        },

        departmentcode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

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

        parentdepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            default: null,
        },

        shortname: {
            type: String,
            trim: true,
            default: "",
        },
        description: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // MANAGEMENT INFORMATION
        // =========================

        departmenthead: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        reportingdepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            default: null,
        },

        businessunit: {
            type: String,
            trim: true,
            default: "",
        },

        costcentercode: {
            type: String,
            trim: true,
            default: "",
        },


        // =========================
        // EMPLOYEE INFORMATION
        // =========================

        employeecapacity: {
            type: Number,
            required: true,
            min: 0,
        },

        curremployeecount: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
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
// UNIQUE DEPARTMENT CODE
// =========================

departmentMasterSchema.index(
    { departmentcode: 1 },
    { unique: true }
);


module.exports = mongoose.model(
    "DepartmentMaster",
    departmentMasterSchema
);