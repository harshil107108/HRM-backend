const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            default: "Password@123",
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        role: {
            type: String,
            enum: ["Super Admin", "HR Admin", "Payroll Specialist", "Department Manager", "Recruiter", "Employee"],
            default: "Employee",
        },
        status: {
            type: String,
            enum: ["Active", "Inactive", "Suspended"],
            default: "Active",
        },
        lastLogin: {
            type: Date,
            default: null,
        },
        employeeRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
