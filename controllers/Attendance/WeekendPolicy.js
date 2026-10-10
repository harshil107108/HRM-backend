const WeekendPolicy = require("../../modals/Attendance/WeekendPolicyModel");

module.exports.getWeekendPolicies = async (req, res) => {
    try {
        const policies = await WeekendPolicy.find({})
            .populate("applicableBranches", "branchname branchcode")
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

module.exports.getWeekendPolicyById = async (req, res) => {
    try {
        const { _id } = req.body;
        const policy = await WeekendPolicy.findById(_id)
            .populate("applicableBranches", "branchname");

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: "Weekend policy not found",
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

module.exports.addEditWeekendPolicy = async (req, res) => {
    try {
        const { _id, ...policyData } = req.body;

        if (_id) {
            const policy = await WeekendPolicy.findByIdAndUpdate(_id, policyData, {
                new: true,
                runValidators: true,
            });

            if (!policy) {
                return res.status(404).json({
                    success: false,
                    message: "Weekend policy not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Weekend policy updated successfully",
                data: policy,
            });
        }

        const policy = await WeekendPolicy.create(policyData);
        res.status(201).json({
            success: true,
            message: "Weekend policy created successfully",
            data: policy,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteWeekendPolicyById = async (req, res) => {
    try {
        const { _id } = req.body;
        const policy = await WeekendPolicy.findByIdAndDelete(_id);

        if (!policy) {
            return res.status(404).json({
                success: false,
                message: "Weekend policy not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Weekend policy deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
