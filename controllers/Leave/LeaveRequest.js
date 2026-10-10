const LeaveRequest = require("../../modals/Leave/LeaveRequestModel");
const LeaveBalance = require("../../modals/Leave/LeaveBalanceModel");

module.exports.getLeaveRequests = async (req, res) => {
    try {
        const requests = await LeaveRequest.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .populate("leaveType", "typeName typeCode isPaid")
            .populate("approverId", "employeeId firstName lastName")
            .sort({ startDate: -1 });

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

module.exports.getLeaveRequestById = async (req, res) => {
    try {
        const { _id } = req.body;
        const request = await LeaveRequest.findById(_id)
            .populate("employeeId", "employeeId firstName lastName")
            .populate("leaveType", "typeName typeCode");

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Leave request not found",
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

module.exports.addEditLeaveRequest = async (req, res) => {
    try {
        const { _id, ...requestData } = req.body;

        if (_id) {
            const request = await LeaveRequest.findByIdAndUpdate(_id, requestData, {
                new: true,
                runValidators: true,
            });

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: "Leave request not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Leave request updated successfully",
                data: request,
            });
        }

        const request = await LeaveRequest.create(requestData);
        res.status(201).json({
            success: true,
            message: "Leave request submitted successfully",
            data: request,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLeaveRequestById = async (req, res) => {
    try {
        const { _id } = req.body;
        const request = await LeaveRequest.findByIdAndDelete(_id);

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Leave request not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave request deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
