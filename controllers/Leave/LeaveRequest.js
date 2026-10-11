const mongoose = require("mongoose");
const LeaveRequest = require("../../modals/Leave/LeaveRequestModel");
const LeaveBalance = require("../../modals/Leave/LeaveBalanceModel");

module.exports.getLeaveRequests = async (req, res) => {
    try {
        const filter = req.user.roleCode === "EMPLOYEE"
            ? { employeeId: req.user.employee._id }
            : {};
        const requests = await LeaveRequest.find(filter)
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
        const filter = { _id };
        if (req.user.roleCode === "EMPLOYEE") {
            filter.employeeId = req.user.employee._id;
        }
        const request = await LeaveRequest.findOne(filter)
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
        const isEmployee = req.user.roleCode === "EMPLOYEE";

        // Request creation and editing must not bypass the approval workflow.
        delete requestData.status;
        delete requestData.approverId;
        delete requestData.approverRemarks;

        if (isEmployee) {
            requestData.employeeId = req.user.employee._id;
        }

        if (_id) {
            const request = await LeaveRequest.findOneAndUpdate(
                {
                    _id,
                    status: "Pending",
                    ...(isEmployee ? { employeeId: req.user.employee._id } : {}),
                },
                requestData,
                {
                new: true,
                runValidators: true,
                }
            );

            if (!request) {
                const existingRequest = await LeaveRequest.exists({ _id });
                return res.status(existingRequest ? 409 : 404).json({
                    success: false,
                    message: existingRequest
                        ? "Only pending leave requests can be edited"
                        : "Leave request not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Leave request updated successfully",
                data: request,
            });
        }

        requestData.status = "Pending";
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

module.exports.updateLeaveRequestStatus = async (req, res) => {
    try {
        if (req.user.roleCode === "EMPLOYEE") {
            return res.status(403).json({
                success: false,
                message: "Employees cannot approve or reject leave requests",
            });
        }

        const { _id, status, approverRemarks = "" } = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid leave request ID is required",
            });
        }
        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Leave request status must be Approved or Rejected",
            });
        }
        if (typeof approverRemarks !== "string") {
            return res.status(400).json({
                success: false,
                message: "Review notes must be text",
            });
        }

        const request = await LeaveRequest.findOneAndUpdate(
            { _id, status: "Pending" },
            {
                $set: {
                    status,
                    approverId: req.user.employee._id,
                    approverRemarks: approverRemarks.trim(),
                },
            },
            { new: true, runValidators: true },
        )
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .populate("leaveType", "typeName typeCode isPaid")
            .populate("approverId", "employeeId firstName lastName");

        if (!request) {
            const existingRequest = await LeaveRequest.exists({ _id });
            return res.status(existingRequest ? 409 : 404).json({
                success: false,
                message: existingRequest
                    ? "Only pending leave requests can be approved or rejected"
                    : "Leave request not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: `Leave request ${status.toLowerCase()} successfully`,
            data: request,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLeaveRequestById = async (req, res) => {
    try {
        const { _id } = req.body;
        const request = await LeaveRequest.findOneAndDelete({
            _id,
            status: "Pending",
            ...(req.user.roleCode === "EMPLOYEE"
                ? { employeeId: req.user.employee._id }
                : {}),
        });

        if (!request) {
            const existingRequest = await LeaveRequest.exists({ _id });
            return res.status(existingRequest ? 409 : 404).json({
                success: false,
                message: existingRequest
                    ? "Only pending leave requests can be deleted"
                    : "Leave request not found",
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
