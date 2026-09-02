const DepartmentMaster = require(
    "../../modals/Organization/DepartmentMasterModel"
);


// =========================
// GET ALL DEPARTMENT
// =========================

module.exports.getDepartment = async (req, res) => {
    try {

        const departments = await DepartmentMaster.find({})
            .populate(
                "company",
                "companyName companyCode"
            )
            .populate(
                "branch",
                "branchname branchcode"
            )
            .populate(
                "parentdepartment",
                "departmentname departmentcode shortname"
            )
            .populate(
                "departmenthead",
                "firstName middleName lastName employeeId"
            )
            .populate(
                "reportingdepartment",
                "departmentname departmentcode"
            )
            .sort({
                departmentname: 1
            });

        res.status(200).json({
            success: true,
            data: departments
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// GET DEPARTMENT BY ID
// =========================

module.exports.getDepartmentById = async (req, res) => {
    try {

        const { _id } = req.body;

        const department =
            await DepartmentMaster.findById(_id)
                .populate(
                    "company",
                    "companyName companyCode"
                )
                .populate(
                    "branch",
                    "branchname branchcode"
                )
                .populate(
                    "parentdepartment",
                    "departmentname departmentcode shortname"
                )
                .populate(
                    "departmenthead",
                    "firstName middleName lastName employeeId"
                )
                .populate(
                    "reportingdepartment",
                    "departmentname departmentcode"
                );

        if (!department) {

            return res.status(404).json({
                success: false,
                message: "Department not found"
            });

        }

        res.status(200).json({
            success: true,
            data: department
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// ADD / EDIT DEPARTMENT
// =========================

module.exports.addEditDepartment = async (req, res) => {
    try {

        const {
            _id,
            ...departmentData
        } = req.body;


        let department;


        // =========================
        // EDIT DEPARTMENT
        // =========================

        if (_id) {

            department =
                await DepartmentMaster.findByIdAndUpdate(
                    _id,
                    departmentData,
                    {
                        new: true,
                        runValidators: true
                    }
                );

            if (!department) {

                return res.status(404).json({
                    success: false,
                    message: "Department not found"
                });

            }

            return res.status(200).json({
                success: true,
                message: "Department updated successfully",
                data: department
            });
        }


        // =========================
        // ADD DEPARTMENT
        // =========================

        department =
            await DepartmentMaster.create(
                departmentData
            );

        res.status(201).json({
            success: true,
            message: "Department added successfully",
            data: department
        });

    } catch (error) {

        // Duplicate department code
        if (error.code === 11000) {

            return res.status(409).json({
                success: false,
                message: "Department code already exists"
            });

        }

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// DELETE DEPARTMENT
// =========================

module.exports.deleteDepartmentById = async (req, res) => {
    try {

        const { _id } = req.body;

        const department =
            await DepartmentMaster.findByIdAndDelete(_id);

        if (!department) {

            return res.status(404).json({
                success: false,
                message: "Department not found"
            });

        }

        res.status(200).json({
            success: true,
            message: "Department deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};


// =========================
// DEPARTMENT HELP
// =========================

module.exports.getDepartmentHelp = async (req, res) => {
    try {

        const departments =
            await DepartmentMaster.find(
                {
                    isActive: true
                },
                {
                    _id: 1,
                    departmentname: 1,
                    departmentcode: 1,
                    shortname: 1
                }
            )
                .sort({
                    departmentname: 1
                });

        res.status(200).json({
            success: true,
            data: departments
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }
};