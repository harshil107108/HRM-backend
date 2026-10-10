const TaxManagement = require("../../modals/Payroll/TaxManagementModel");

module.exports.getTaxDeclarations = async (req, res) => {
    try {
        const declarations = await TaxManagement.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .sort({ financialYear: -1, createdAt: -1 });

        res.status(200).json({
            success: true,
            data: declarations,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getTaxDeclarationById = async (req, res) => {
    try {
        const { _id } = req.body;
        const dec = await TaxManagement.findById(_id)
            .populate("employeeId", "employeeId firstName lastName");

        if (!dec) {
            return res.status(404).json({
                success: false,
                message: "Tax declaration record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: dec,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditTaxDeclaration = async (req, res) => {
    try {
        const { _id, ...taxData } = req.body;

        const inv80c = Math.min(150000, Number(taxData.declaredInvestments80C || 0));
        const med80d = Math.min(50000, Number(taxData.declaredHealthInsurance80D || 0));
        const rent = Number(taxData.houseRentPaidAnnual || 0);

        // Approximate annual projected tax for standard salary ranges
        const estimatedTaxableDeduction = inv80c + med80d + (rent * 0.2);
        taxData.projectedAnnualTax = Math.max(0, 48000 - Math.round(estimatedTaxableDeduction * 0.15));
        taxData.monthlyTds = Math.round(taxData.projectedAnnualTax / 12);

        if (_id) {
            const dec = await TaxManagement.findByIdAndUpdate(_id, taxData, {
                new: true,
                runValidators: true,
            });

            if (!dec) {
                return res.status(404).json({
                    success: false,
                    message: "Tax declaration record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Tax declaration updated successfully",
                data: dec,
            });
        }

        const dec = await TaxManagement.create(taxData);
        res.status(201).json({
            success: true,
            message: "Tax declaration submitted successfully",
            data: dec,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteTaxDeclarationById = async (req, res) => {
    try {
        const { _id } = req.body;
        const dec = await TaxManagement.findByIdAndDelete(_id);

        if (!dec) {
            return res.status(404).json({
                success: false,
                message: "Tax declaration record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Tax declaration deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
