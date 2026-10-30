const LeaveBalance = require("../../modals/Leave/LeaveBalanceModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const LeaveType = require("../../modals/Leave/LeaveTypeModel");
const LeaveRequest = require("../../modals/Leave/LeaveRequestModel");

const hasAdminRights = (user) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const roleCode = String(user.roleCode || user.role?.roleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ADMIN", "HR"].includes(roleCode);
};

module.exports.getLeaveBalances = async (req, res) => {
    try {
        const isAdmin = hasAdminRights(req.user);
        const currentYear = Number(req.body?.year) || new Date().getFullYear();

        // Security: Non-Admin can only access their own leave balance
        const currentEmployeeId = req.user?.employee?._id;
        const targetEmployeeId = isAdmin
            ? (req.body?.employeeId || null)
            : currentEmployeeId;

        if (!isAdmin && !currentEmployeeId) {
            return res.status(200).json({
                success: true,
                isAdmin: false,
                data: [],
            });
        }

        const empFilter = targetEmployeeId
            ? { _id: targetEmployeeId }
            : { isActive: { $ne: false } };

        const [employees, leaveTypes] = await Promise.all([
            EmployeeMaster.find(empFilter).select("employeeId firstName middleName lastName officialEmail").lean(),
            LeaveType.find({ isActive: { $ne: false } }).lean(),
        ]);

        // Auto-sync: Ensure every relevant employee and active leave type has a LeaveBalance document for the year
        for (const emp of employees) {
            for (const lt of leaveTypes) {
                // Calculate used days strictly from APPROVED requests for this year
                const approvedRequests = await LeaveRequest.find({
                    employeeId: emp._id,
                    leaveType: lt._id,
                    status: "Approved",
                    startDate: {
                        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                    },
                }).lean();
                const usedDays = approvedRequests.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

                // Calculate pending days from PENDING requests for this year
                const pendingRequests = await LeaveRequest.find({
                    employeeId: emp._id,
                    leaveType: lt._id,
                    status: "Pending",
                    startDate: {
                        $gte: new Date(`${currentYear}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${currentYear}-12-31T23:59:59.999Z`),
                    },
                }).lean();
                const pendingDays = pendingRequests.reduce((sum, r) => sum + (Number(r.totalDays) || 0), 0);

                let balance = await LeaveBalance.findOne({
                    employeeId: emp._id,
                    leaveType: lt._id,
                    year: currentYear,
                });

                const totalAllocated = balance ? Number(balance.totalAllocated) : (Number(lt.daysAllowedPerYear) || 12);
                // Leave is deducted when approved: balanceDays = totalAllocated - usedDays
                const balanceDays = Math.max(0, totalAllocated - usedDays);

                if (!balance) {
                    await LeaveBalance.create({
                        employeeId: emp._id,
                        leaveType: lt._id,
                        year: currentYear,
                        totalAllocated,
                        usedDays,
                        pendingDays,
                        balanceDays,
                    });
                } else if (balance.usedDays !== usedDays || balance.pendingDays !== pendingDays || balance.balanceDays !== balanceDays) {
                    balance.usedDays = usedDays;
                    balance.pendingDays = pendingDays;
                    balance.balanceDays = balanceDays;
                    await balance.save();
                }
            }
        }

        const query = { year: currentYear };
        if (targetEmployeeId) {
            query.employeeId = targetEmployeeId;
        }
        if (req.body?.leaveType || req.body?.leaveTypeId) {
            query.leaveType = req.body.leaveType || req.body.leaveTypeId;
        }

        const balances = await LeaveBalance.find(query)
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .populate("leaveType", "typeName typeCode isPaid colorCode daysAllowedPerYear")
            .lean();

        const formatted = balances.map((b) => ({
            ...b,
            credited: b.totalAllocated,
            used: b.usedDays,
            pending: b.pendingDays,
            remaining: b.balanceDays,
            employeeName: b.employeeId
                ? `${b.employeeId.firstName || ""} ${b.employeeId.lastName || ""} (${b.employeeId.employeeId || ""})`
                : "N/A",
            leaveTypeName: b.leaveType?.typeName || b.leaveType?.typeCode || "N/A",
        }));

        formatted.sort((a, b) => {
            const empDiff = (a.employeeName || "").localeCompare(b.employeeName || "");
            if (empDiff !== 0) return empDiff;
            return (a.leaveTypeName || "").localeCompare(b.leaveTypeName || "");
        });

        res.status(200).json({
            success: true,
            isAdmin,
            data: formatted,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getLeaveBalanceById = async (req, res) => {
    try {
        const { _id } = req.body;
        const isAdmin = hasAdminRights(req.user);
        const currentEmployeeId = req.user?.employee?._id;

        const balance = await LeaveBalance.findById(_id)
            .populate("employeeId", "employeeId firstName lastName")
            .populate("leaveType", "typeName typeCode");

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: "Leave balance record not found",
            });
        }

        // Security check: non-admin can only access their own record
        if (!isAdmin && (!currentEmployeeId || balance.employeeId?._id?.toString() !== currentEmployeeId.toString())) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view another employee's leave balance.",
            });
        }

        const b = balance.toObject();
        b.credited = b.totalAllocated;
        b.used = b.usedDays;
        b.pending = b.pendingDays;
        b.remaining = b.balanceDays;
        b.leaveTypeId = b.leaveType?._id || b.leaveType;

        res.status(200).json({
            success: true,
            data: b,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditLeaveBalance = async (req, res) => {
    try {
        const isAdmin = hasAdminRights(req.user);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only Administrators and HR are authorized to allocate or adjust employee leave balances.",
            });
        }

        const { _id, ...balanceData } = req.body;

        if (balanceData.leaveTypeId && !balanceData.leaveType) {
            balanceData.leaveType = balanceData.leaveTypeId;
        }
        if (balanceData.credited !== undefined && balanceData.totalAllocated === undefined) {
            balanceData.totalAllocated = Number(balanceData.credited) || 0;
        }
        if (balanceData.used !== undefined && balanceData.usedDays === undefined) {
            balanceData.usedDays = Number(balanceData.used) || 0;
        }
        if (balanceData.pending !== undefined && balanceData.pendingDays === undefined) {
            balanceData.pendingDays = Number(balanceData.pending) || 0;
        }

        const totalAllocated = Number(balanceData.totalAllocated ?? 12);
        const usedDays = Number(balanceData.usedDays ?? 0);
        const pendingDays = Number(balanceData.pendingDays ?? 0);
        balanceData.totalAllocated = totalAllocated;
        balanceData.usedDays = usedDays;
        balanceData.pendingDays = pendingDays;
        balanceData.balanceDays = Math.max(0, totalAllocated - usedDays);

        if (_id) {
            const balance = await LeaveBalance.findByIdAndUpdate(_id, balanceData, {
                new: true,
                runValidators: true,
            });

            if (!balance) {
                return res.status(404).json({
                    success: false,
                    message: "Leave balance record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Leave balance record updated successfully",
                data: balance,
            });
        }

        const balance = await LeaveBalance.create(balanceData);
        res.status(201).json({
            success: true,
            message: "Leave balance created successfully",
            data: balance,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLeaveBalanceById = async (req, res) => {
    try {
        const isAdmin = hasAdminRights(req.user);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only Administrators and HR are authorized to delete employee leave balances.",
            });
        }

        const { _id } = req.body;
        const balance = await LeaveBalance.findByIdAndDelete(_id);

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: "Leave balance record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave balance record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
