const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        loanType: {
            type: String,
            enum: ["Personal Loan", "Education Loan", "Medical Emergency", "Home Appliance", "Vehicle Loan", "Salary Advance"],
            default: "Personal Loan",
        },
        loanAmount: {
            type: Number,
            required: true,
        },
        interestRate: {
            type: Number,
            default: 0,
        },
        tenureMonths: {
            type: Number,
            required: true,
            default: 12,
        },
        monthlyEmi: {
            type: Number,
            required: true,
        },
        disbursementDate: {
            type: Date,
            default: null,
        },
        paidAmount: {
            type: Number,
            default: 0,
        },
        remainingAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["Pending Approval", "Approved", "Active", "Closed", "Rejected"],
            default: "Pending Approval",
        },
        reason: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Loan", loanSchema);
