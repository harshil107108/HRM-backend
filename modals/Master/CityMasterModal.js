const mongoose = require("mongoose");

const cityMasterSchema = new mongoose.Schema(
    {
        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "CountryMaster",
        },

        stateId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "StateMaster",
        },

        cityCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        cityName: {
            type: String,
            required: true,
            trim: true,
        },

        postalPrefix: {
            type: String,
            trim: true,
        },

        latitude: {
            type: String,
            trim: true,
        },

        longitude: {
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

module.exports = mongoose.model("CityMaster", cityMasterSchema);