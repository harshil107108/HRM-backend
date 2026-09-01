const BranchMaster = require("../../modals/Organization/BranchMasterModel");


module.exports.getBranch = async (req, res) => {
    try {

        const branches = await BranchMaster.find({})
            .populate(
                "parentcompany",
                "companyName companyCode"
            )
            .populate(
                "country",
                "countryName"
            )
            .populate(
                "state",
                "stateName"
            )
            .populate(
                "city",
                "cityName"
            )
            .sort({
                branchname: 1
            });

        res.status(200).json({
            success: true,
            data: branches
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// GET BRANCH BY ID
// =========================

module.exports.getBranchById = async (req, res) => {
    try {

        const { _id } = req.body;

        const branch = await BranchMaster.findById(_id)
            .populate(
                "parentcompany",
                "companyName companyCode"
            )
            .populate(
                "country",
                "countryName"
            )
            .populate(
                "state",
                "stateName"
            )
            .populate(
                "city",
                "cityName"
            );

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Branch not found"
            });
        }

        res.status(200).json({
            success: true,
            data: branch
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// ADD / EDIT BRANCH
// =========================

module.exports.addEditBranch = async (req, res) => {
    try {

        const {
            _id,
            ...branchData
        } = req.body;


        // =========================
        // IMAGE UPLOAD
        // =========================

        if (req.file) {
            branchData.branchImage =
                `/uploads/branches/${req.file.filename}`;
        }


        let branch;


        // =========================
        // EDIT BRANCH
        // =========================

        if (_id) {

            branch = await BranchMaster.findByIdAndUpdate(
                _id,
                branchData,
                {
                    new: true,
                    runValidators: true
                }
            );

            if (!branch) {
                return res.status(404).json({
                    success: false,
                    message: "Branch not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Branch updated successfully",
                data: branch
            });
        }


        // =========================
        // ADD BRANCH
        // =========================

        branch = await BranchMaster.create(
            branchData
        );

        res.status(201).json({
            success: true,
            message: "Branch added successfully",
            data: branch
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Branch code already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =========================
// DELETE BRANCH
// =========================

module.exports.deleteBranchById = async (req, res) => {
    try {

        const { _id } = req.body;

        const branch =
            await BranchMaster.findByIdAndDelete(_id);

        if (!branch) {
            return res.status(404).json({
                success: false,
                message: "Branch not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Branch deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// BRANCH HELP / DROPDOWN
// =========================

module.exports.getBranchHelp = async (req, res) => {
    try {

        const branches = await BranchMaster.find(
            {
                isActive: true
            },
            {
                _id: 1,
                branchname: 1,
                branchcode: 1
            }
        )
            .sort({
                branchname: 1
            });

        res.status(200).json({
            success: true,
            data: branches
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};