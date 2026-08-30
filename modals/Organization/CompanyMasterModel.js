const mongoose = require("mongoose");

const companyMasterSchema = new mongoose.Schema(
    {
        // =========================
        // BASIC INFORMATION
        // =========================

        companyName: {
            type: String,
            required: true,
            trim: true,
        },

        legalName: {
            type: String,
            required: true,
            trim: true,
        },

        companyCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        businessEmail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
        },

        website: {
            type: String,
            required: true,
            trim: true,
        },

        // Company Logo / Image
        companyImage: {
            type: String,
            default: "",
        },


        // =========================
        // BUSINESS INFORMATION
        // =========================

        gstNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        panNumber: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        registrationNumber: {
            type: String,
            required: true,
            trim: true,
        },

        industryname: {
            type: String,
            default: "",
            trim: true,
        },

        establishDate: {
            type: Date,
            required: true,
        },


        // =========================
        // ADDRESS INFORMATION
        // =========================

        addressLine1: {
            type: String,
            required: true,
            trim: true,
        },

        addressLine2: {
            type: String,
            trim: true,
            default: "",
        },

        country: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CountryMaster",
            required: true,
        },

        state: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "StateMaster",
            required: true,
        },

        city: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CityMaster",
            required: true,
        },

        postalCode: {
            type: String,
            required: true,
            trim: true,
        },


        // =========================
        // STATUS
        // =========================

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
    "CompanyMaster",
    companyMasterSchema
);