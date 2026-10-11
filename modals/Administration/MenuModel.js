const mongoose = require("mongoose");

// Sidebar menu entry (Menu Master). A group has no parent; an item's parent
// is its group. Role permissions are keyed by `menuCode`, so codes must stay
// stable even if the name, path or order changes.
const menuSchema = new mongoose.Schema(
    {
        menuName: {
            type: String,
            required: true,
            trim: true,
        },
        menuCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            match: [/^[A-Z0-9_]+$/, "Menu code may only contain letters, numbers and underscores"],
        },
        // Frontend route, e.g. "/master/countries". Groups use their prefix.
        path: {
            type: String,
            default: "",
            trim: true,
        },
        // lucide-react icon name, e.g. "Database" (groups only).
        icon: {
            type: String,
            default: "",
            trim: true,
        },
        parentMenu: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Menu",
            default: null,
        },
        sortOrder: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        description: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Menu", menuSchema);
