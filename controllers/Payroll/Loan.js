const Loan = require("../../modals/Payroll/LoanModel");

module.exports.getLoans = async (req, res) => {
    try {
        const loans = await Loan.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: loans,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getLoanById = async (req, res) => {
    try {
        const { _id } = req.body;
        const loan = await Loan.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Loan record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: loan,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditLoan = async (req, res) => {
    try {
        const { _id, ...loanData } = req.body;

        const amount = Number(loanData.loanAmount || 0);
        const tenure = Number(loanData.tenureMonths || 12);
        const paid = Number(loanData.paidAmount || 0);

        if (!loanData.monthlyEmi) {
            loanData.monthlyEmi = Math.round(amount / tenure);
        }
        loanData.remainingAmount = Math.max(0, amount - paid);

        if (loanData.remainingAmount === 0 && paid > 0) {
            loanData.status = "Closed";
        }

        if (_id) {
            const loan = await Loan.findByIdAndUpdate(_id, loanData, {
                new: true,
                runValidators: true,
            });

            if (!loan) {
                return res.status(404).json({
                    success: false,
                    message: "Loan record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Loan record updated successfully",
                data: loan,
            });
        }

        const loan = await Loan.create(loanData);
        res.status(201).json({
            success: true,
            message: "Loan application submitted successfully",
            data: loan,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLoanById = async (req, res) => {
    try {
        const { _id } = req.body;
        const loan = await Loan.findByIdAndDelete(_id);

        if (!loan) {
            return res.status(404).json({
                success: false,
                message: "Loan record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Loan record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
