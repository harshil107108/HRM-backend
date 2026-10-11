const mongoose = require("mongoose");

const offerLetterSchema = new mongoose.Schema(
    {
        candidate: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Candidate",
            required: true,
        },
        jobOpening: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "JobOpening",
            required: true,
        },
        offeredDesignation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DesignationMaster",
            required: true,
        },
        offeredDepartment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "DepartmentMaster",
            required: true,
        },
        offeredCtc: {
            type: Number,
            required: true,
        },
        joiningDate: {
            type: Date,
            required: true,
        },
        validUntil: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ["Draft", "Sent", "Accepted", "Declined", "Expired", "Revoked"],
            default: "Draft",
        },
        positionCounted: {
            type: Boolean,
            default: false,
        },
        remarks: {
            type: String,
            default: "",
            trim: true,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("OfferLetter", offerLetterSchema);
