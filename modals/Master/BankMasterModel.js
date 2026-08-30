const mongoose = require("mongoose");

const bankMasterSchema = new mongoose.Schema(
    {
        bankName: {
            type: String,
            required: true,
            trim: true,
        },

        shortName: {
            type: String,   
            required: true,
            trim: true,
            uppercase: true,
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
    "BankMaster",
    bankMasterSchema
);