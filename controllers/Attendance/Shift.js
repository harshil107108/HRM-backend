const Shift = require("../../modals/Attendance/ShiftModel");

module.exports.getShifts = async (req, res) => {
    try {
        const shifts = await Shift.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: shifts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getShiftById = async (req, res) => {
    try {
        const { _id } = req.body;
        const shift = await Shift.findById(_id);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: "Shift not found",
            });
        }

        res.status(200).json({
            success: true,
            data: shift,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditShift = async (req, res) => {
    try {
        const { _id, ...shiftData } = req.body;

        if (_id) {
            const shift = await Shift.findByIdAndUpdate(_id, shiftData, {
                new: true,
                runValidators: true,
            });

            if (!shift) {
                return res.status(404).json({
                    success: false,
                    message: "Shift not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Shift updated successfully",
                data: shift,
            });
        }

        const shift = await Shift.create(shiftData);
        res.status(201).json({
            success: true,
            message: "Shift created successfully",
            data: shift,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteShiftById = async (req, res) => {
    try {
        const { _id } = req.body;
        const shift = await Shift.findByIdAndDelete(_id);

        if (!shift) {
            return res.status(404).json({
                success: false,
                message: "Shift not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Shift deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getShiftHelp = async (req, res) => {
    try {
        const shifts = await Shift.find({ isActive: true }, { _id: 1, shiftName: 1, shiftCode: 1, startTime: 1, endTime: 1 }).sort({ shiftName: 1 });
        res.status(200).json({
            success: true,
            data: shifts,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
