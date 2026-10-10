const Payslip = require("../../modals/Payroll/PayslipModel");

module.exports.getPayslips = async (req, res) => {
    try {
        const payslips = await Payslip.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ year: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: payslips,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getPayslipById = async (req, res) => {
    try {
        const { _id } = req.body;
        const payslip = await Payslip.findById(_id)
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail branchId departmentId designationId");

        if (!payslip) {
            return res.status(404).json({
                success: false,
                message: "Payslip not found",
            });
        }

        res.status(200).json({
            success: true,
            data: payslip,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditPayslip = async (req, res) => {
    try {
        const { _id, ...payslipData } = req.body;

        const basic = Number(payslipData.basicSalary || 0);
        const hra = Number(payslipData.hra || 0);
        const special = Number(payslipData.specialAllowance || 0);
        const other = Number(payslipData.otherAllowances || 0);
        const pf = Number(payslipData.providentFund || 0);
        const pt = Number(payslipData.professionalTax || 0);
        const tds = Number(payslipData.tds || 0);

        payslipData.grossEarnings = basic + hra + special + other;
        payslipData.totalDeductions = pf + pt + tds;
        payslipData.netSalary = payslipData.grossEarnings - payslipData.totalDeductions;

        if (!payslipData.payslipNumber) {
            payslipData.payslipNumber = `PS-${Date.now().toString().slice(-6)}`;
        }

        if (_id) {
            const payslip = await Payslip.findByIdAndUpdate(_id, payslipData, {
                new: true,
                runValidators: true,
            });

            if (!payslip) {
                return res.status(404).json({
                    success: false,
                    message: "Payslip not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Payslip updated successfully",
                data: payslip,
            });
        }

        const payslip = await Payslip.create(payslipData);
        res.status(201).json({
            success: true,
            message: "Payslip generated successfully",
            data: payslip,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deletePayslipById = async (req, res) => {
    try {
        const { _id } = req.body;
        const payslip = await Payslip.findByIdAndDelete(_id);

        if (!payslip) {
            return res.status(404).json({
                success: false,
                message: "Payslip not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Payslip deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
