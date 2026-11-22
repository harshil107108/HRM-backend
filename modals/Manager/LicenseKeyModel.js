const mongoose = require("mongoose");

const licenseKeySchema = new mongoose.Schema(
    {
        licenseId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        licenseKey: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        signaturePayload: {
            type: String,
            required: true, // Signed cryptographic payload
        },
        clientId: {
            type: String,
            trim: true,
            default: () => `CLI-${Date.now().toString(36).toUpperCase()}`,
        },
        tenantDbName: {
            type: String,
            trim: true,
            default: "",
        },
        clientInfo: {
            name: {
                type: String,
                required: [true, "Client contact name is required"],
                trim: true,
            },
            email: {
                type: String,
                required: [true, "Client email is required"],
                trim: true,
                lowercase: true,
            },
            companyName: {
                type: String,
                required: [true, "Company name is required"],
                trim: true,
            },
            allowedDomains: {
                type: [String],
                default: ["*"], // Wildcard or specific domains e.g. ["tenant.hrm.com", "localhost"]
            },
            machineFingerprint: {
                type: String,
                default: "", // Hardware UUID / MAC / Server IP for On-Premise lock
            },
        },
        // Client Admin Credentials (provisioned for this client upon license generation/activation)
        adminCredentials: {
            username: {
                type: String,
                trim: true,
                default: "",
            },
            password: {
                type: String,
                default: "",
            },
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Plan",
            required: [true, "Base plan reference is required"],
        },
        // Dynamic Add-Ons Engine (Customization Overrides)
        addOns: {
            extraModules: {
                type: [String],
                default: [], // Extra modules granted beyond base plan
            },
            extraActiveUsers: {
                type: Number,
                default: 0,
                min: 0,
            },
            extraEmployeeRecords: {
                type: Number,
                default: 0,
                min: 0,
            },
            extraStorageGB: {
                type: Number,
                default: 0,
                min: 0,
            },
            customFlags: {
                type: Map,
                of: mongoose.Schema.Types.Mixed,
                default: {}, // e.g., { whiteLabel: true, customBranding: true }
            },
        },
        // Effective limits computed from Base Plan + Add-Ons
        effectiveLimits: {
            totalActiveUsers: {
                type: Number,
                required: true,
                default: 10,
            },
            totalEmployeeRecords: {
                type: Number,
                required: true,
                default: 50,
            },
            totalStorageGB: {
                type: Number,
                default: 10,
            },
            allAllowedModules: {
                type: [String],
                default: [],
            },
        },
        dates: {
            issuedAt: {
                type: Date,
                default: Date.now,
            },
            activatedAt: {
                type: Date,
                default: null,
            },
            expiresAt: {
                type: Date,
                required: [true, "License expiration date is required"],
            },
            gracePeriodDays: {
                type: Number,
                default: 7,
                min: 0,
                max: 30,
            },
        },
        renewalPolicy: {
            type: String,
            enum: ["Manual", "Auto-Renew", "One-time"],
            default: "Manual",
        },
        isActive: {
            type: Boolean,
            default: false,
            index: true,
        },
        activeUsers: [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeMaster" },
                username: { type: String, default: "" },
                loginAt: { type: Date, default: Date.now },
                lastSeen: { type: Date, default: Date.now },
            },
        ],
        status: {
            type: String,
            enum: ["GENERATED", "ACTIVE", "GRACE_PERIOD", "EXPIRED", "SUSPENDED", "REVOKED"],
            default: "GENERATED",
        },
        metadata: {
            lastHeartbeat: {
                type: Date,
                default: null,
            },
            lastActionTimestamp: {
                type: Date,
                default: Date.now,
            },
            clockRollbackDetected: {
                type: Boolean,
                default: false,
            },
            revocationReason: {
                type: String,
                default: "",
            },
            revokedAt: {
                type: Date,
                default: null,
            },
            ipAddress: {
                type: String,
                default: "",
            },
            activatedBy: {
                type: String,
                default: "",
            },
        },
    },
    { timestamps: true }
);

// Pre-save hook: auto-compute IDs and enforce date consistency
licenseKeySchema.pre("validate", function () {
    if (!this.licenseId) {
        const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.licenseId = `LIC-${Date.now().toString(36).toUpperCase()}-${rand}`;
    }
    if (!this.tenantDbName && this.licenseId) {
        const cleanId = String(this.licenseId).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
        this.tenantDbName = `HRM_tenant_${cleanId}`;
    }
    if (this.dates && this.dates.expiresAt && this.dates.issuedAt) {
        if (new Date(this.dates.expiresAt) <= new Date(this.dates.issuedAt)) {
            throw new Error("License expiration date must be in the future of the issue date.");
        }
    }
});

module.exports = mongoose.model("LicenseKey", licenseKeySchema);

