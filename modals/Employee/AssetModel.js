const mongoose = require("mongoose");

const assetSchema = new mongoose.Schema(
    {
        // =========================================================
        // BASIC INFORMATION
        // =========================================================

        assetName: {
            type: String,
            required: true,
            trim: true,
        },

        assetCode: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
        },

        assetCategory: {
            type: String,
             trim: true,
        },

        assetTag: {
            type: String,
            required: true,
            trim: true,
        },

        // =========================================================
        // ASSET DETAILS
        // =========================================================

        brand: {
            type: String,
            trim: true,
            default: "",
        },

        model: {
            type: String,
            trim: true,
            default: "",
        },

        serialNumber: {
            type: String,
            trim: true,
            default: "",
        },

        condition: {
            type: String,
            required: true,
            enum: [
                "NEW",
                "EXCELLENT",
                "GOOD",
                "FAIR",
                "DAMAGED",
            ],
        },

        // =========================================================
        // PURCHASE INFORMATION
        // =========================================================

        purchaseDate: {
            type: Date,
            default: null,
        },

        purchaseCost: {
            type: Number,
            min: 0,
            default: 0,
        },

        vendor: {
            type: String,
            trim: true,
            default: "",
        },

        invoiceNumber: {
            type: String,
            trim: true,
            default: "",
        },

        warrantyStartDate: {
            type: Date,
            default: null,
        },

        warrantyEndDate: {
            type: Date,
            default: null,
        },

        // =========================================================
        // ORGANIZATION INFORMATION
        // =========================================================

        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CompanyMaster",
            required: true,
        },

        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "BranchMaster",
            default: null,
        },

        department: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            default: null,
        },

        // =========================================================
        // ASSIGNMENT INFORMATION
        // =========================================================

        assignedEmployee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            default: null,
        },

        assignedDate: {
            type: Date,
            default: null,
        },

        expectedReturnDate: {
            type: Date,
            default: null,
        },

        // =========================================================
        // ASSET STATUS
        // =========================================================

        assetStatus: {
            type: String,
            required: true,
            enum: [
                "AVAILABLE",
                "ASSIGNED",
                "UNDER_REPAIR",
                "LOST",
                "DISPOSED",
            ],
            default: "AVAILABLE",
        },

        // =========================================================
        // DOCUMENTS / FILES
        // =========================================================

        assetImage: {
            type: String,
            default: "",
        },

        purchaseInvoice: {
            type: String,
            default: "",
        },

        warrantyDocument: {
            type: String,
            default: "",
        },

        otherDocument: {
            type: String,
            default: "",
        },

        // =========================================================
        // ADDITIONAL
        // =========================================================

       description: {
    type: String,
    trim: true,
    default: "",
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

// Unique asset code
assetSchema.index(
    { assetCode: 1 },
    { unique: true }
);

// Unique asset tag
assetSchema.index(
    { assetTag: 1 },
    { unique: true }
);

module.exports = mongoose.model(
    "AssetMaster",
    assetSchema
);