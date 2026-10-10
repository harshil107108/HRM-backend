const mongoose = require("mongoose");

const leaveTypeSchema = new mongoose.Schema(
    {
        typeName: {
            type: String,
            required: true,
            trim: true,
        },
        typeCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        daysAllowedPerYear: {
            type: Number,
            required: true,
            default: 12,
        },
        isPaid: {
            type: Boolean,
            default: true,
        },
        isEncashable: {
            type: Boolean,
            default: false,
        },
        colorCode: {
            type: String,
            default: "#3B82F6",
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

module.exports = mongoose.model("LeaveType", leaveTypeSchema);
