const AttendanceRequest = require("../../modals/Attendance/AttendanceRequestModel");

module.exports.getAttendanceRequests = async (req, res) => {
    try {
        const requests = await AttendanceRequest.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .populate("reviewedBy", "employeeId firstName lastName")
            .sort({ requestDate: -1 });

        res.status(200).json({
            success: true,
            data: requests,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getAttendanceRequestById = async (req, res) => {
    try {
        const { _id } = req.body;
        const request = await AttendanceRequest.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Attendance request not found",
            });
        }

        res.status(200).json({
            success: true,
            data: request,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditAttendanceRequest = async (req, res) => {
    try {
        const { _id, ...requestData } = req.body;

        if (_id) {
            const request = await AttendanceRequest.findByIdAndUpdate(_id, requestData, {
                new: true,
                runValidators: true,
            });

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: "Attendance request not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Attendance request updated successfully",
                data: request,
            });
        }

        const request = await AttendanceRequest.create(requestData);
        res.status(201).json({
            success: true,
            message: "Attendance regularization requested successfully",
            data: request,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteAttendanceRequestById = async (req, res) => {
    try {
        const { _id } = req.body;
        const request = await AttendanceRequest.findByIdAndDelete(_id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Attendance request not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Attendance request deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
