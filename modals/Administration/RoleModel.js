const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema(
    {
        roleName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        roleCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
        isSystemDefault: {
            type: Boolean,
            default: false,
        },
        permissions: {
            type: Map,
            of: [String], // e.g. { employees: ["read", "write", "delete"], payroll: ["read"] }
            default: {},
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Role", roleSchema);
