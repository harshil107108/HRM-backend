const mongoose = require("mongoose");

const stateMasterSchema = new mongoose.Schema(
    {
        stateId: {
            type: Number,
            // required: true,
        },

        countryId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: "CountryMaster",
        },

        stateCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        stateName: {
            type: String,
            required: true,
            trim: true,
        },

        gstStateCode: {
            type: String,
            required: true,
            trim: true,
        },

        capital: {
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

module.exports = mongoose.model("StateMaster", stateMasterSchema);