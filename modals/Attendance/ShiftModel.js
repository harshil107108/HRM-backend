const mongoose = require("mongoose");

const shiftSchema = new mongoose.Schema(
    {
        shiftName: {
            type: String,
            required: true,
            trim: true,
        },
        shiftCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },
        startTime: {
            type: String,
            required: true,
            default: "09:00",
        },
        endTime: {
            type: String,
            required: true,
            default: "18:00",
        },
        gracePeriodMinutes: {
            type: Number,
            default: 15,
        },
        halfDayHours: {
            type: Number,
            default: 4.5,
        },
        fullDayHours: {
            type: Number,
            default: 8.5,
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

module.exports = mongoose.model("Shift", shiftSchema);
