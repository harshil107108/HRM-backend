const mongoose = require("mongoose");

const payrollProcessSchema = new mongoose.Schema(
    {
        payrollMonth: {
            type: String,
            required: true,
        },
        payrollYear: {
            type: Number,
            required: true,
            default: () => new Date().getFullYear(),
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        basicPay: {
            type: Number,
            required: true,
            default: 0,
        },
        allowances: {
            type: Number,
            default: 0,
        },
        deductions: {
            type: Number,
            default: 0,
        },
        grossPay: {
            type: Number,
            required: true,
            default: 0,
        },
        netPay: {
            type: Number,
            required: true,
            default: 0,
        },
        workingDays: {
            type: Number,
            default: 30,
        },
        paidDays: {
            type: Number,
            default: 30,
        },
        paymentStatus: {
            type: String,
            enum: ["Draft", "Processed", "Paid", "On Hold"],
            default: "Draft",
        },
        paymentMode: {
            type: String,
            enum: ["Bank Transfer", "Cheque", "Cash", "UPI"],
            default: "Bank Transfer",
        },
        disbursementDate: {
            type: Date,
            default: null,
        },
        remarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PayrollProcess", payrollProcessSchema);
