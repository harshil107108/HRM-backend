const SalaryStructure = require("../../modals/Payroll/SalaryStructureModel");

module.exports.getSalaryStructures = async (req, res) => {
    try {
        const structures = await SalaryStructure.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: structures,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getSalaryStructureById = async (req, res) => {
    try {
        const { _id } = req.body;
        const structure = await SalaryStructure.findById(_id);

        if (!structure) {
            return res.status(404).json({
                success: false,
                message: "Salary structure not found",
            });
        }

        res.status(200).json({
            success: true,
            data: structure,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditSalaryStructure = async (req, res) => {
    try {
        const { _id, ...structureData } = req.body;

        const basic = Number(structureData.basicSalary || 0);
        const hra = Number(structureData.hra || 0);
        const conveyance = Number(structureData.conveyance || 0);
        const special = Number(structureData.specialAllowance || 0);
        const medical = Number(structureData.medicalAllowance || 0);
        const pf = Number(structureData.providentFund || 0);
        const pt = Number(structureData.professionalTax || 0);

        structureData.grossSalary = basic + hra + conveyance + special + medical;
        structureData.totalDeductions = pf + pt;
        structureData.netSalary = structureData.grossSalary - structureData.totalDeductions;

        if (_id) {
            const structure = await SalaryStructure.findByIdAndUpdate(_id, structureData, {
                new: true,
                runValidators: true,
            });

            if (!structure) {
                return res.status(404).json({
                    success: false,
                    message: "Salary structure not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Salary structure updated successfully",
                data: structure,
            });
        }

        const structure = await SalaryStructure.create(structureData);
        res.status(201).json({
            success: true,
            message: "Salary structure created successfully",
            data: structure,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteSalaryStructureById = async (req, res) => {
    try {
        const { _id } = req.body;
        const structure = await SalaryStructure.findByIdAndDelete(_id);

        if (!structure) {
            return res.status(404).json({
                success: false,
                message: "Salary structure not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Salary structure deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getSalaryStructureHelp = async (req, res) => {
    try {
        const structures = await SalaryStructure.find({ isActive: true }, { _id: 1, structureName: 1, grossSalary: 1, netSalary: 1 }).sort({ structureName: 1 });

        res.status(200).json({
            success: true,
            data: structures,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
