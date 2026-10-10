const AttendanceLog = require("../../modals/Attendance/AttendanceLogModel");

module.exports.getAttendanceLogs = async (req, res) => {
    try {
        const logs = await AttendanceLog.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ date: -1 });

        res.status(200).json({
            success: true,
            data: logs,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getAttendanceLogById = async (req, res) => {
    try {
        const { _id } = req.body;
        const log = await AttendanceLog.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Attendance log not found",
            });
        }

        res.status(200).json({
            success: true,
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditAttendanceLog = async (req, res) => {
    try {
        const { _id, ...logData } = req.body;

        if (_id) {
            const log = await AttendanceLog.findByIdAndUpdate(_id, logData, {
                new: true,
                runValidators: true,
            });

            if (!log) {
                return res.status(404).json({
                    success: false,
                    message: "Attendance log not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Attendance log updated successfully",
                data: log,
            });
        }

        const log = await AttendanceLog.create(logData);
        res.status(201).json({
            success: true,
            message: "Attendance log added successfully",
            data: log,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteAttendanceLogById = async (req, res) => {
    try {
        const { _id } = req.body;
        const log = await AttendanceLog.findByIdAndDelete(_id);

        if (!log) {
            return res.status(404).json({
                success: false,
                message: "Attendance log not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Attendance log deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
