const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["Break", "Task", "Celebration", "Meeting", "Other"],
      required: true,
      default: "Task",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    category: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100,
    },
    startTime: {
      type: String, // e.g. "12:30 PM" or ISO string
      required: true,
    },
    endTime: {
      type: String, // e.g. "01:15 PM" or ISO string
      default: "",
    },
    durationMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ["Completed", "In Progress"],
      default: "Completed",
    },
  },
  { timestamps: true }
);

const dayReportSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EmployeeMaster",
      required: true,
      index: true,
    },
    date: {
      type: String, // Stored as "YYYY-MM-DD" for precise day-wise queries
      required: true,
      index: true,
    },
    totalWorkMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalBreakMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    activities: [activitySchema],
    status: {
      type: String,
      enum: ["Draft", "Submitted", "Locked", "Approved"],
      default: "Draft",
    },
    unlockedBySupervisor: {
      type: Boolean,
      default: false,
    },
    unlockedAt: {
      type: Date,
    },
    unlockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// Unique compound index: one day report per employee per date
dayReportSchema.index({ employeeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("EmployeeDayReport", dayReportSchema);
