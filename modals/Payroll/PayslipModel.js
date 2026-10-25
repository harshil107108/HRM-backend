const mongoose = require("mongoose");

const payslipSchema = new mongoose.Schema(
    {
        payslipNumber: {
            type: String,
            required: true,
            unique: true,
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        month: {
            type: String,
            required: true,
        },
        year: {
            type: Number,
            required: true,
        },
        basicSalary: {
            type: Number,
            required: true,
        },
        hra: {
            type: Number,
            default: 0,
        },
        da: {
            type: Number,
            default: 0,
        },
        ctc: {
            type: Number,
            default: 0,
        },
        conveyance: {
            type: Number,
            default: 0,
        },
        specialAllowance: {
            type: Number,
            default: 0,
        },
        otherAllowances: {
            type: Number,
            default: 0,
        },
        providentFund: {
            type: Number,
            default: 0,
        },
        epf: {
            type: Number,
            default: 0,
        },
        esi: {
            type: Number,
            default: 0,
        },
        professionalTax: {
            type: Number,
            default: 0,
        },
        tds: {
            type: Number,
            default: 0,
        },
        leaveDeduction: {
            type: Number,
            default: 0,
        },
        unpaidLeaveDays: {
            type: Number,
            default: 0,
        },
        grossEarnings: {
            type: Number,
            required: true,
        },
        totalDeductions: {
            type: Number,
            required: true,
        },
        netSalary: {
            type: Number,
            required: true,
        },
        netPay: {
            type: Number,
            default: function () {
                return this.netSalary;
            },
        },
        paymentMode: {
            type: String,
            default: "Bank Transfer",
        },
        paymentDate: {
            type: Date,
            default: Date.now,
        },
        generatedDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["Generated", "Sent", "Viewed", "Paid", "Unpaid", "On Hold"],
            default: "Paid",
        },
        paymentStatus: {
            type: String,
            default: "Paid",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Payslip", payslipSchema);
