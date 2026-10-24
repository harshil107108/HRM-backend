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

        // Synchronize isActive and status
        if (policyData.status === "Active") {
            policyData.isActive = true;
            // RULE: Only ONE policy can be Active at a time. Deactivate all others.
            if (_id) {
                await WeekendPolicy.updateMany(
                    { _id: { $ne: _id } },
                    { $set: { status: "Inactive", isActive: false } }
                );
            } else {
                await WeekendPolicy.updateMany(
                    {},
                    { $set: { status: "Inactive", isActive: false } }
                );
            }
        } else if (policyData.status === "Inactive") {
            policyData.isActive = false;
        }

        // Synchronize alternateSaturdayRule if alternateRules or alternateDay exists
        if (Array.isArray(policyData.alternateRules) && policyData.alternateRules.length > 0) {
            const satRule = policyData.alternateRules.find(r => r.day === "Saturday");
            if (satRule) {
                policyData.alternateSaturdayRule = `${satRule.pattern} Saturday Off`;
            }
        } else if (policyData.alternateDay === "Saturday") {
            policyData.alternateSaturdayRule = `${policyData.alternatePattern || "2nd & 4th"} Saturday Off`;
        }

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
