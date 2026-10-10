const mongoose = require("mongoose");

const taxManagementSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        financialYear: {
            type: String,
            required: true,
            default: "2025-2026",
        },
        taxRegime: {
            type: String,
            enum: ["New Tax Regime", "Old Tax Regime"],
            default: "New Tax Regime",
        },
        declaredInvestments80C: {
            type: Number,
            default: 0,
        },
        declaredHealthInsurance80D: {
            type: Number,
            default: 0,
        },
        houseRentPaidAnnual: {
            type: Number,
            default: 0,
        },
        homeLoanInterest24B: {
            type: Number,
            default: 0,
        },
        otherExemptions: {
            type: Number,
            default: 0,
        },
        projectedAnnualTax: {
            type: Number,
            default: 0,
        },
        monthlyTds: {
            type: Number,
            default: 0,
        },
        declarationStatus: {
            type: String,
            enum: ["Draft", "Submitted", "Verified", "Locked"],
            default: "Submitted",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("TaxManagement", taxManagementSchema);
