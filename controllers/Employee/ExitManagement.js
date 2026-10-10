const ExitManagement = require("../../modals/Employee/ExitManagementModel");

module.exports.getExit = async (req, res) => {
    try {
        const exits = await ExitManagement.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: exits,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getExitById = async (req, res) => {
    try {
        const { _id } = req.body;
        const exit = await ExitManagement.findById(_id)
            .populate("employeeId", "employeeId firstName middleName lastName");

        if (!exit) {
            return res.status(404).json({
                success: false,
                message: "Exit record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: exit,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditExit = async (req, res) => {
    try {
        const { _id, ...exitData } = req.body;

        if (_id) {
            const exit = await ExitManagement.findByIdAndUpdate(_id, exitData, {
                new: true,
                runValidators: true,
            });

            if (!exit) {
                return res.status(404).json({
                    success: false,
                    message: "Exit record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Exit record updated successfully",
                data: exit,
            });
        }

        const exit = await ExitManagement.create(exitData);
        res.status(201).json({
            success: true,
            message: "Exit request submitted successfully",
            data: exit,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteExitById = async (req, res) => {
    try {
        const { _id } = req.body;
        const exit = await ExitManagement.findByIdAndDelete(_id);

        if (!exit) {
            return res.status(404).json({
                success: false,
                message: "Exit record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Exit record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
