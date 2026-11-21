const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
    {
        planId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        name: {
            type: String,
            required: [true, "Plan name is required"],
            trim: true,
        },
        code: {
            type: String,
            required: [true, "Plan code is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },
        tier: {
            type: String,
            enum: ["Basic", "Standard", "Industry", "Enterprise", "Custom"],
            default: "Standard",
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        badgeColor: {
            type: String,
            default: "indigo", // e.g. blue, emerald, indigo, purple, amber
        },
        pricing: {
            monthly: {
                type: Number,
                default: 0,
                min: 0,
            },
            annually: {
                type: Number,
                default: 0,
                min: 0,
            },
            currency: {
                type: String,
                default: "USD",
                uppercase: true,
                trim: true,
            },
            billingFrequencies: {
                type: [String],
                enum: ["Monthly", "Quarterly", "Semi-Annual", "Annual", "Lifetime"],
                default: ["Monthly", "Annual"],
            },
        },
        // Module codes included in this base plan (e.g. ['EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'PAYROLL', ...])
        includedModules: {
            type: [String],
            default: ["DASHBOARD", "EMPLOYEES"],
        },
        // Sub-feature flags inside modules (e.g. { "payroll_auto_tax": false, "recruitment_ai_screening": false })
        featureFlags: {
            type: Map,
            of: Boolean,
            default: {},
        },
        quotas: {
            maxActiveUsers: {
                type: Number,
                required: true,
                default: 10,
                min: [1, "At least 1 active user login is required"],
            },
            maxEmployeeRecords: {
                type: Number,
                required: true,
                default: 50,
                min: [1, "At least 1 employee record storage is required"],
            },
            storageQuotaGB: {
                type: Number,
                default: 10,
                min: 1,
            },
            apiRateLimitPerMonth: {
                type: Number,
                default: 50000,
                min: 0,
            },
        },
        status: {
            type: String,
            enum: ["Draft", "Active", "Deprecated", "Archived"],
            default: "Active",
        },
        isPopular: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// Auto-generate planId if not provided
planSchema.pre("validate", function () {
    if (!this.planId) {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.planId = `PLAN-${Date.now().toString(36).toUpperCase()}-${rand}`;
    }
    if (this.code) {
        this.code = this.code.trim().toUpperCase().replace(/\s+/g, "-");
    }
});

module.exports = mongoose.model("Plan", planSchema);

