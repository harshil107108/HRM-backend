const LeaveType = require("../../modals/Leave/LeaveTypeModel");

module.exports.getLeaveTypes = async (req, res) => {
    try {
        const types = await LeaveType.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: types,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getLeaveTypeById = async (req, res) => {
    try {
        const { _id } = req.body;
        const type = await LeaveType.findById(_id);

        if (!type) {
            return res.status(404).json({
                success: false,
                message: "Leave type not found",
            });
        }

        res.status(200).json({
            success: true,
            data: type,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditLeaveType = async (req, res) => {
    try {
        const { _id, ...typeData } = req.body;

        if (_id) {
            const type = await LeaveType.findByIdAndUpdate(_id, typeData, {
                new: true,
                runValidators: true,
            });

            if (!type) {
                return res.status(404).json({
                    success: false,
                    message: "Leave type not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Leave type updated successfully",
                data: type,
            });
        }

        const type = await LeaveType.create(typeData);
        res.status(201).json({
            success: true,
            message: "Leave type created successfully",
            data: type,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLeaveTypeById = async (req, res) => {
    try {
        const { _id } = req.body;
        const type = await LeaveType.findByIdAndDelete(_id);

        if (!type) {
            return res.status(404).json({
                success: false,
                message: "Leave type not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave type deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getLeaveTypeHelp = async (req, res) => {
    try {
        const types = await LeaveType.find({ isActive: true }, { _id: 1, typeName: 1, typeCode: 1, isPaid: 1, daysAllowedPerYear: 1 }).sort({ typeName: 1 });

        res.status(200).json({
            success: true,
            data: types,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
