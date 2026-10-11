const SalaryStructure = require("../../modals/Payroll/SalaryStructureModel");

const getAmount = (value, fieldName) => {
    if (value === undefined || value === null || value === "") {
        return 0;
    }
    if (typeof value !== "number" && typeof value !== "string") {
        const error = new Error(`${fieldName} must be a valid non-negative amount`);
        error.statusCode = 400;
        throw error;
    }

    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0) {
        const error = new Error(`${fieldName} must be a valid non-negative amount`);
        error.statusCode = 400;
        throw error;
    }

    return amount;
};

const roundCurrency = (amount) => Math.round((amount + Number.EPSILON) * 100) / 100;

const calculateSalaryTotals = (structureData) => {
    const amounts = {
        basicSalary: roundCurrency(getAmount(structureData.basicSalary, "Basic salary")),
        hra: roundCurrency(getAmount(structureData.hra, "HRA")),
        da: roundCurrency(getAmount(structureData.da, "Dearness allowance")),
        conveyance: roundCurrency(getAmount(structureData.conveyance, "Conveyance allowance")),
        specialAllowance: roundCurrency(getAmount(structureData.specialAllowance, "Special allowance")),
        providentFund: roundCurrency(getAmount(structureData.providentFund, "EPF")),
        esi: roundCurrency(getAmount(structureData.esi, "ESI")),
        professionalTax: roundCurrency(getAmount(structureData.professionalTax, "Professional tax")),
        otherDeductions: roundCurrency(getAmount(structureData.otherDeductions, "Other deductions")),
    };
    const { basicSalary: basic, hra, da, conveyance, specialAllowance: special } = amounts;
    const { providentFund: pf, esi, professionalTax: pt, otherDeductions } = amounts;
    const grossSalary = roundCurrency(basic + hra + da + conveyance + special);
    const totalDeductions = roundCurrency(pf + esi + pt + otherDeductions);
    const netSalary = roundCurrency(grossSalary - totalDeductions);

    if (![grossSalary, totalDeductions, netSalary].every(Number.isFinite)) {
        const error = new Error("Salary amounts exceed the supported range");
        error.statusCode = 400;
        throw error;
    }
    if (netSalary < 0) {
        const error = new Error("Total deductions cannot exceed gross salary");
        error.statusCode = 400;
        throw error;
    }

    return { ...amounts, grossSalary, totalDeductions, netSalary };
};

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
        if (structureData.providentFund === undefined && structureData.epf !== undefined) {
            structureData.providentFund = structureData.epf;
        }
        delete structureData.epf;

        const existingStructure = _id ? await SalaryStructure.findById(_id) : null;
        if (_id && !existingStructure) {
            return res.status(404).json({
                success: false,
                message: "Salary structure not found",
            });
        }
        if (!String(structureData.structureName || "").trim()) {
            if (existingStructure) {
                structureData.structureName = existingStructure.structureName;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Structure name is required",
                });
            }
        }
        if (structureData.basicSalary === undefined || structureData.basicSalary === null || structureData.basicSalary === "") {
            if (existingStructure) {
                structureData.basicSalary = existingStructure.basicSalary;
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Basic salary is required",
                });
            }
        }

        const calculationSource = {
            ...(existingStructure?.toObject() || {}),
            ...structureData,
        };
        Object.assign(structureData, calculateSalaryTotals(calculationSource));

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
        const statusCode =
            error.statusCode ||
            (error.name === "ValidationError" || error.name === "CastError" ? 400 : 500);
        res.status(statusCode).json({
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
