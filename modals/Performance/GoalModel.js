const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ["Organizational", "Departmental", "Individual KPI", "Personal Growth", "Technical Mastery"],
            default: "Individual KPI",
        },
        targetDate: {
            type: Date,
            required: true,
        },
        weightagePercentage: {
            type: Number,
            default: 25,
        },
        progressPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        status: {
            type: String,
            enum: ["Not Started", "In Progress", "On Track", "Achieved", "Behind Schedule"],
            default: "In Progress",
        },
        keyResults: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);
