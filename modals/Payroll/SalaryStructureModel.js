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
            default: 25000,
        },
        hra: {
            type: Number,
            default: 10000,
        },
        conveyance: {
            type: Number,
            default: 3000,
        },
        specialAllowance: {
            type: Number,
            default: 5000,
        },
        medicalAllowance: {
            type: Number,
            default: 2000,
        },
        providentFund: {
            type: Number,
            default: 1800,
        },
        professionalTax: {
            type: Number,
            default: 200,
        },
        grossSalary: {
            type: Number,
            default: 45000,
        },
        totalDeductions: {
            type: Number,
            default: 2000,
        },
        netSalary: {
            type: Number,
            default: 43000,
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
