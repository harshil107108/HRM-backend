const mongoose = require("mongoose");

const employeeFaceSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "EmployeeMaster",
            required: true,
            unique: true,
            index: true,
        },
        // 128-dimensional (or 512-d) feature vector extracted from face image
        embedding: {
            type: [Number],
            required: true,
        },
        algorithm: {
            type: String,
            default: "OpenCV-YuNet-SFace",
        },
        faceSnapshot: {
            type: String,
            default: "",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastRecognizedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("EmployeeFace", employeeFaceSchema);
