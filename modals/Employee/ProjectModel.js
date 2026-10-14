const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
    {
        projectName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        clientName: {
            type: String,
            required: true,
            trim: true,
            maxlength: 160,
        },
        startDate: {
            type: Date,
            default: null,
        },
        deadline: {
            type: Date,
            default: null,
        },
        budget: {
            type: Number,
            default: null,
            min: 0,
        },
        estimatedHours: {
            type: Number,
            default: null,
            min: 0,
        },
        developers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
        }],
        status: {
            type: String,
            enum: ["Planning", "Active", "On Hold", "Completed", "Cancelled"],
            default: "Planning",
        },
        requiredTask: {
            type: String,
            default: "",
            trim: true,
            maxlength: 4000,
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 4000,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
    },
    { timestamps: true },
);

projectSchema.index({ projectName: 1, clientName: 1 });

module.exports = mongoose.model("EmployeeProject", projectSchema);
