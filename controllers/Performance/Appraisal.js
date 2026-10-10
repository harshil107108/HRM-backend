const Appraisal = require("../../modals/Performance/AppraisalModel");

module.exports.getAppraisals = async (req, res) => {
    try {
        const appraisals = await Appraisal.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId designationId")
            .populate("proposedDesignation", "designationname designationcode")
            .sort({ effectiveDate: -1 });

        res.status(200).json({
            success: true,
            data: appraisals,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getAppraisalById = async (req, res) => {
    try {
        const { _id } = req.body;
        const appraisal = await Appraisal.findById(_id)
            .populate("employeeId", "employeeId firstName lastName")
            .populate("proposedDesignation", "designationname");

        if (!appraisal) {
            return res.status(404).json({
                success: false,
                message: "Appraisal record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: appraisal,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditAppraisal = async (req, res) => {
    try {
        const { _id, ...appraisalData } = req.body;

        const current = Number(appraisalData.currentSalary || 0);
        const inc = Number(appraisalData.recommendedIncrementPercentage || 0);
        if (!appraisalData.revisedSalary) {
            appraisalData.revisedSalary = Math.round(current * (1 + inc / 100));
        }

        if (_id) {
            const appraisal = await Appraisal.findByIdAndUpdate(_id, appraisalData, {
                new: true,
                runValidators: true,
            });

            if (!appraisal) {
                return res.status(404).json({
                    success: false,
                    message: "Appraisal record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Appraisal record updated successfully",
                data: appraisal,
            });
        }

        const appraisal = await Appraisal.create(appraisalData);
        res.status(201).json({
            success: true,
            message: "Appraisal record created successfully",
            data: appraisal,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteAppraisalById = async (req, res) => {
    try {
        const { _id } = req.body;
        const appraisal = await Appraisal.findByIdAndDelete(_id);

        if (!appraisal) {
            return res.status(404).json({
                success: false,
                message: "Appraisal record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Appraisal record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
