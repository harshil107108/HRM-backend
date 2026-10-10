const mongoose = require("mongoose");

const reimbursementSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        expenseCategory: {
            type: String,
            enum: ["Travel & Conveyance", "Client Meals & Entertainment", "Medical Expenses", "Internet & Mobile", "Office Supplies & Hardware", "Training & Certifications", "Other"],
            default: "Travel & Conveyance",
        },
        expenseDate: {
            type: Date,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        merchantName: {
            type: String,
            default: "",
            trim: true,
        },
        receiptUrl: {
            type: String,
            default: "",
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected", "Paid"],
            default: "Pending",
        },
        reviewerRemarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Reimbursement", reimbursementSchema);
