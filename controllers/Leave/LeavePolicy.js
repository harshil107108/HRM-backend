const LeavePolicy = require("../../modals/Leave/LeavePolicyModel");

module.exports.getLeavePolicies = async (req, res) => {
    try {
        const policies = await LeavePolicy.find({})
            .populate("leaveType", "typeName typeCode isPaid")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: policies,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getLeavePolicyById = async (req, res) => {
    try {
        const { _id } = req.body;
        const policy = await LeavePolicy.findById(_id)
            .populate("leaveType", "typeName typeCode");

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: "Leave policy not found",
            });
        }

        res.status(200).json({
            success: true,
            data: policy,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditLeavePolicy = async (req, res) => {
    try {
        const { _id, ...policyData } = req.body;

        if (_id) {
            const policy = await LeavePolicy.findByIdAndUpdate(_id, policyData, {
                new: true,
                runValidators: true,
            });

            if (!policy) {
                return res.status(404).json({
                    success: false,
                    message: "Leave policy not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Leave policy updated successfully",
                data: policy,
            });
        }

        const policy = await LeavePolicy.create(policyData);
        res.status(201).json({
            success: true,
            message: "Leave policy created successfully",
            data: policy,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLeavePolicyById = async (req, res) => {
    try {
        const { _id } = req.body;
        const policy = await LeavePolicy.findByIdAndDelete(_id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: "Leave policy not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave policy deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
