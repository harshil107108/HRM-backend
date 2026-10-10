const LeaveBalance = require("../../modals/Leave/LeaveBalanceModel");

module.exports.getLeaveBalances = async (req, res) => {
    try {
        const balances = await LeaveBalance.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .populate("leaveType", "typeName typeCode isPaid")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: balances,
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
        const balance = await LeaveBalance.findById(_id)
            .populate("employeeId", "employeeId firstName lastName")
            .populate("leaveType", "typeName typeCode");

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: "Leave balance record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: balance,
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
        const { _id, ...balanceData } = req.body;

        const totalAllocated = Number(balanceData.totalAllocated || 0);
        const usedDays = Number(balanceData.usedDays || 0);
        const pendingDays = Number(balanceData.pendingDays || 0);
        balanceData.balanceDays = totalAllocated - usedDays - pendingDays;

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
