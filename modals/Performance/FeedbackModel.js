const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        givenBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        givenTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        feedbackType: {
            type: String,
            enum: ["360 Peer Review", "Manager Feedback", "Subordinate Feedback", "Client Appreciation", "Spot Recognition"],
            default: "360 Peer Review",
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: 5,
        },
        strengths: {
            type: String,
            required: true,
            trim: true,
        },
        suggestions: {
            type: String,
            default: "",
            trim: true,
        },
        isAnonymous: {
            type: Boolean,
            default: false,
        },
        status: {
            type: String,
            enum: ["Draft", "Published", "Acknowledged"],
            default: "Published",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Feedback", feedbackSchema);
