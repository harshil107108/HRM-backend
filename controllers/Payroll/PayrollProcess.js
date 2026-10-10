const PayrollProcess = require("../../modals/Payroll/PayrollProcessModel");

module.exports.getPayrollProcesses = async (req, res) => {
    try {
        const processes = await PayrollProcess.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ payrollYear: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: processes,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getPayrollProcessById = async (req, res) => {
    try {
        const { _id } = req.body;
        const process = await PayrollProcess.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!process) {
            return res.status(404).json({
                success: false,
                message: "Payroll record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: process,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditPayrollProcess = async (req, res) => {
    try {
        const { _id, ...processData } = req.body;

        const basic = Number(processData.basicPay || 0);
        const allowances = Number(processData.allowances || 0);
        const deductions = Number(processData.deductions || 0);
        processData.grossPay = basic + allowances;
        processData.netPay = processData.grossPay - deductions;

        if (_id) {
            const process = await PayrollProcess.findByIdAndUpdate(_id, processData, {
                new: true,
                runValidators: true,
            });

            if (!process) {
                return res.status(404).json({
                    success: false,
                    message: "Payroll record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Payroll record updated successfully",
                data: process,
            });
        }

        const process = await PayrollProcess.create(processData);
        res.status(201).json({
            success: true,
            message: "Payroll record created successfully",
            data: process,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deletePayrollProcessById = async (req, res) => {
    try {
        const { _id } = req.body;
        const process = await PayrollProcess.findByIdAndDelete(_id);

        if (!process) {
            return res.status(404).json({
                success: false,
                message: "Payroll record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Payroll record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
