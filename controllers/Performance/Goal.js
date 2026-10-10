const Goal = require("../../modals/Performance/GoalModel");

module.exports.getGoals = async (req, res) => {
    try {
        const goals = await Goal.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ targetDate: 1 });

        res.status(200).json({
            success: true,
            data: goals,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getGoalById = async (req, res) => {
    try {
        const { _id } = req.body;
        const goal = await Goal.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: "Goal not found",
            });
        }

        res.status(200).json({
            success: true,
            data: goal,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditGoal = async (req, res) => {
    try {
        const { _id, ...goalData } = req.body;

        const progress = Number(goalData.progressPercentage || 0);
        if (progress >= 100) {
            goalData.status = "Achieved";
        }

        if (_id) {
            const goal = await Goal.findByIdAndUpdate(_id, goalData, {
                new: true,
                runValidators: true,
            });

            if (!goal) {
                return res.status(404).json({
                    success: false,
                    message: "Goal not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Goal updated successfully",
                data: goal,
            });
        }

        const goal = await Goal.create(goalData);
        res.status(201).json({
            success: true,
            message: "Goal set successfully",
            data: goal,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteGoalById = async (req, res) => {
    try {
        const { _id } = req.body;
        const goal = await Goal.findByIdAndDelete(_id);

        if (!goal) {
            return res.status(404).json({
                success: false,
                message: "Goal not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Goal deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
