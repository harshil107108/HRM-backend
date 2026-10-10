const Reimbursement = require("../../modals/Payroll/ReimbursementModel");

module.exports.getReimbursements = async (req, res) => {
    try {
        const items = await Reimbursement.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ expenseDate: -1 });

        res.status(200).json({
            success: true,
            data: items,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getReimbursementById = async (req, res) => {
    try {
        const { _id } = req.body;
        const item = await Reimbursement.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Reimbursement claim not found",
            });
        }

        res.status(200).json({
            success: true,
            data: item,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditReimbursement = async (req, res) => {
    try {
        const { _id, ...itemData } = req.body;

        if (_id) {
            const item = await Reimbursement.findByIdAndUpdate(_id, itemData, {
                new: true,
                runValidators: true,
            });

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Reimbursement claim not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Reimbursement claim updated successfully",
                data: item,
            });
        }

        const item = await Reimbursement.create(itemData);
        res.status(201).json({
            success: true,
            message: "Reimbursement claim submitted successfully",
            data: item,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteReimbursementById = async (req, res) => {
    try {
        const { _id } = req.body;
        const item = await Reimbursement.findByIdAndDelete(_id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Reimbursement claim not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Reimbursement claim deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
