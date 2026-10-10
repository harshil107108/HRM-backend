const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema(
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
        roundName: {
            type: String,
            required: true,
            trim: true,
            enum: ["Initial Screening", "Technical Round 1", "Technical Round 2", "Managerial Round", "HR Round", "Final Discussion"],
            default: "Technical Round 1",
        },
        interviewer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
        },
        scheduledDate: {
            type: Date,
            required: true,
        },
        durationMinutes: {
            type: Number,
            default: 45,
        },
        meetingLinkOrLocation: {
            type: String,
            default: "",
            trim: true,
        },
        status: {
            type: String,
            enum: ["Scheduled", "Completed", "Cancelled", "Rescheduled", "No Show"],
            default: "Scheduled",
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        feedback: {
            type: String,
            default: "",
            trim: true,
        },
        recommendation: {
            type: String,
            enum: ["Strong Hire", "Hire", "Hold", "Reject", "Pending"],
            default: "Pending",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Interview", interviewSchema);
