const AttendanceLog = require("../../modals/Attendance/AttendanceLogModel");
const mongoose = require("mongoose");

const getDateOnly = (value) => {
    if (!value) return null;
    const dateOnly = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return undefined;

    const date = new Date(`${dateOnly}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dateOnly
        ? undefined
        : dateOnly;
};

const getTodayDateOnly = () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${month}-${day}`;
};

const formatClockTime = (value) => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
    if (!match) return value;

    const hour24 = Number(match[1]);
    return `${hour24 % 12 || 12}:${match[2]} ${hour24 < 12 ? "AM" : "PM"}`;
};

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

        const attendanceDate = getDateOnly(logData.date);
        if (!attendanceDate) {
            return res.status(400).json({
                success: false,
                message: "A valid Attendance Date is required",
            });
        }
        const employeeId = String(
            logData.employeeId?._id || logData.employeeId || ""
        ).trim();
        if (!mongoose.isValidObjectId(employeeId)) {
            return res.status(400).json({
                success: false,
                message: "A valid employee is required for an attendance log",
            });
        }
        logData.employeeId = new mongoose.Types.ObjectId(employeeId);
        if (attendanceDate > getTodayDateOnly()) {
            return res.status(400).json({
                success: false,
                message: "Attendance Date cannot be after today",
            });
        }

        const dayStart = new Date(`${attendanceDate}T00:00:00.000Z`);
        const dayEnd = new Date(dayStart);
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
        logData.date = dayStart;
        const duplicateFilter = {
            date: { $gte: dayStart, $lt: dayEnd },
            $expr: {
                $eq: [
                    {
                        $convert: {
                            input: "$employeeId",
                            to: "string",
                            onError: "",
                            onNull: "",
                        },
                    },
                    employeeId,
                ],
            },
        };
        if (_id) duplicateFilter._id = { $ne: _id };

        const existingAttendance = logData.employeeId
            ? await AttendanceLog.findOne(duplicateFilter).select("clockIn")
            : null;

        if (existingAttendance) {
            const clockInMessage = existingAttendance.clockIn
                ? ` Clock In time: ${formatClockTime(existingAttendance.clockIn)}.`
                : "";
            return res.status(409).json({
                success: false,
                message: `User is already present for this date.${clockInMessage}`,
            });
        }

        const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
        for (const field of ["clockIn", "clockOut"]) {
            if (logData[field] && !timePattern.test(logData[field])) {
                return res.status(400).json({
                    success: false,
                    message: `${field === "clockIn" ? "Clock In" : "Clock Out"} must be a valid time`,
                });
            }
        }

        if (Boolean(logData.clockIn) !== Boolean(logData.clockOut)) {
            return res.status(400).json({
                success: false,
                message: "Clock In and Clock Out must both be provided",
            });
        }

        if (logData.clockIn && logData.clockOut) {
            const toMinutes = (time) => {
                const [hours, minutes] = time.split(":").map(Number);
                return hours * 60 + minutes;
            };
            const duration =
                (toMinutes(logData.clockOut) -
                    toMinutes(logData.clockIn) +
                    24 * 60) %
                (24 * 60);
            logData.totalHours = Number((duration / 60).toFixed(1));
        }

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
