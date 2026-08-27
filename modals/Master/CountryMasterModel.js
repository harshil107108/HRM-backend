const mongoose = require("mongoose");

const countryMasterSchema = new mongoose.Schema(
    {
        countryName: {
            type: String,
            required: true,
            trim: true,
        },

        countryCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 2,
        },

        isoCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            maxlength: 3,
        },

        phoneCode: {
            type: String,
            trim: true,
        },

        nationality: {
            type: String,
            trim: true,
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

module.exports = mongoose.model("CountryMaster", countryMasterSchema);