const mongoose = require("mongoose");

const salaryStructureSchema = new mongoose.Schema(
    {
        structureName: {
            type: String,
            required: true,
            trim: true,
        },
        basicSalary: {
            type: Number,
            required: true,
            min: 0,
        },
        hra: {
            type: Number,
            default: 0,
            min: 0,
        },
        da: {
            type: Number,
            default: 0,
            min: 0,
        },
        conveyance: {
            type: Number,
            default: 0,
            min: 0,
        },
        specialAllowance: {
            type: Number,
            default: 0,
            min: 0,
        },
        esi: {
            type: Number,
            default: 0,
            min: 0,
        },
        otherDeductions: {
            type: Number,
            default: 0,
            min: 0,
        },
        medicalAllowance: {
            type: Number,
            default: 0,
            min: 0,
        },
        providentFund: {
            type: Number,
            default: 0,
            min: 0,
        },
        professionalTax: {
            type: Number,
            default: 0,
            min: 0,
        },
        grossSalary: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalDeductions: {
            type: Number,
            default: 0,
            min: 0,
        },
        netSalary: {
            type: Number,
            default: 0,
            min: 0,
        },
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

module.exports = mongoose.model("SalaryStructure", salaryStructureSchema);
