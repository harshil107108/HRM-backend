const mongoose = require("mongoose");

const holidayMasterSchema = new mongoose.Schema(
    {
        holidayName: {
            type: String,
            required: true,
            trim: true,
        },

        holidayCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 15,
        },

        holidayDate: {
            type: Date,
            required: true,
        },

        holidayType: {
            type: String,
            required: true,
            enum: [
                "national",
                "regional",
                "festival",
                "company",
                "bank",
                "optional",
            ],
        },

        recurringEveryYear: {
            type: Boolean,
            default: true,
        },

        optionalHoliday: {
            type: Boolean,
            default: false,
        },

        paidHoliday: {
            type: Boolean,
            default: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "HolidayMaster",
    holidayMasterSchema
);