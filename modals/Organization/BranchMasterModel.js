const mongoose = require("mongoose");

const branchMasterSchema = new mongoose.Schema(
    {
        // =========================
        // BASIC INFORMATION
        // =========================

        branchcode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        branchname: {
            type: String,
            required: true,
            trim: true,
        },

        parentcompany: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyMaster",
            required: true,
        },

        branchtype: {
            type: String,
            required: true,
            trim: true,
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
        // CONTACT INFORMATION
        // =========================

        officialemail: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },

        phonen0: {
            type: String,
            required: true,
            trim: true,
        },

        altphoneno: {
            type: String,
            trim: true,
            default: "",
        },

        website: {
            type: String,
            trim: true,
            default: "",
        },

        supportemail: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },


        // =========================
        // BRANCH IMAGE
        // =========================

        branchImage: {
            type: String,
            default: "",
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
    "BranchMaster",
    branchMasterSchema
);