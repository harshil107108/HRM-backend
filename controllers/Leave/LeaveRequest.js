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

        // Update pendingDays on LeaveBalance
        try {
            const reqYear = new Date(request.startDate).getFullYear();
            let balance = await LeaveBalance.findOne({
                employeeId: request.employeeId,
                leaveType: request.leaveType,
                year: reqYear,
            });
            if (balance) {
                balance.pendingDays = (balance.pendingDays || 0) + (Number(request.totalDays) || 0);
                await balance.save();
            }
        } catch (err) {
            console.error("Failed to update pendingDays on balance:", err);
        }

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
        const allowedRoles = ["ADMIN", "SUPER_ADMIN", "HR", "MANAGER"];
        const userRole = String(req.user?.roleCode || "").toUpperCase();
        const isAuthorizedRole = req.user?.isSuperAdmin || allowedRoles.includes(userRole);

        if (!isAuthorizedRole) {
            return res.status(403).json({
                success: false,
                message: "Employees are not permitted to approve or reject leave requests. Only Admin, HR, or Manager have approval authority.",
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

        // 1. Fetch existing request to verify existence and pending status
        const existingRequest = await LeaveRequest.findById(_id);
        if (!existingRequest) {
            return res.status(404).json({
                success: false,
                message: "Leave request not found",
            });
        }

        if (existingRequest.status !== "Pending") {
            return res.status(409).json({
                success: false,
                message: "Only pending leave requests can be approved or rejected",
            });
        }

        // 2. Prevent self-approval (the applicant cannot approve or reject their own leave)
        const currentEmpId = req.user?.employee?._id;
        const applicantEmpId = existingRequest.employeeId;

        if (
            currentEmpId &&
            applicantEmpId &&
            currentEmpId.toString() === applicantEmpId.toString()
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot approve or reject your own leave request. It must be reviewed by another manager, HR, or administrator.",
            });
        }

        // 3. Update the status with approver audit trail
        const request = await LeaveRequest.findByIdAndUpdate(
            _id,
            {
                $set: {
                    status,
                    approverId: currentEmpId,
                    approverRemarks: approverRemarks.trim(),
                },
            },
            { new: true, runValidators: true }
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

        // Deduct from LeaveBalance when Approved, or update pending on Reject
        const requestYear = new Date(request.startDate).getFullYear();
        const LeaveTypeModel = require("../../modals/Leave/LeaveTypeModel");
        const empId = request.employeeId?._id || request.employeeId;
        const ltId = request.leaveType?._id || request.leaveType;

        let balance = await LeaveBalance.findOne({
            employeeId: empId,
            leaveType: ltId,
            year: requestYear,
        });

        if (!balance) {
            const leaveTypeDoc = await LeaveTypeModel.findById(ltId);
            balance = new LeaveBalance({
                employeeId: empId,
                leaveType: ltId,
                year: requestYear,
                totalAllocated: leaveTypeDoc?.daysAllowedPerYear || 12,
                usedDays: 0,
                pendingDays: 0,
                balanceDays: leaveTypeDoc?.daysAllowedPerYear || 12,
            });
        }

        if (status === "Approved") {
            balance.usedDays = (balance.usedDays || 0) + (Number(request.totalDays) || 0);
            balance.pendingDays = Math.max(0, (balance.pendingDays || 0) - (Number(request.totalDays) || 0));
            balance.balanceDays = Math.max(0, balance.totalAllocated - balance.usedDays);
            await balance.save();
        } else if (status === "Rejected") {
            balance.pendingDays = Math.max(0, (balance.pendingDays || 0) - (Number(request.totalDays) || 0));
            balance.balanceDays = Math.max(0, balance.totalAllocated - balance.usedDays);
            await balance.save();
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
        const userRole = String(req.user?.roleCode || "").toUpperCase();
        const isAdmin = Boolean(req.user?.isSuperAdmin || ["SUPER_ADMIN", "ADMIN", "HR"].includes(userRole));

        const request = await LeaveRequest.findOneAndDelete({
            _id,
            status: "Pending",
            ...(!isAdmin && req.user?.employee?._id
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

        // Adjust pendingDays on LeaveBalance
        try {
            const reqYear = new Date(request.startDate).getFullYear();
            let balance = await LeaveBalance.findOne({
                employeeId: request.employeeId,
                leaveType: request.leaveType,
                year: reqYear,
            });
            if (balance) {
                balance.pendingDays = Math.max(0, (balance.pendingDays || 0) - (Number(request.totalDays) || 0));
                await balance.save();
            }
        } catch (err) {
            console.error("Failed to decrement pendingDays on delete:", err);
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
