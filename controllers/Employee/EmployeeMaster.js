const bcrypt = require("bcryptjs");

const EmployeeMaster = require(
    "../../modals/Employee/EmployeeMasterModel"
);


// =========================
// GET ALL EMPLOYEES
// =========================

module.exports.getEmployee = async (req, res) => {
    try {
        const employees = await EmployeeMaster.find({})
            .select("-password")
            .populate("companyId", "companyName")
            .populate("branchId", "branchName")
            .populate("departmentId", "departmentName")
            .populate("designationId", "designationName")
            .populate("reportingManager", "employeeId firstName lastName")
            .populate("countryId", "countryName")
            .populate("stateId", "stateName")
            .populate("cityId", "cityName")
            .populate("bankName", "bankName")
            .populate("salaryStructure", "name")
            .populate("userGroup", "groupName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: employees
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =========================
// GET EMPLOYEE BY ID
// =========================

module.exports.getEmployeeById = async (req, res) => {
    try {
        const { _id } = req.body;

        const employee = await EmployeeMaster.findById(_id)
            .select("-password")
            .populate("companyId", "companyName")
            .populate("branchId", "branchName")
            .populate("departmentId", "departmentName")
            .populate("designationId", "designationName")
            .populate("reportingManager", "employeeId firstName lastName")
            .populate("countryId", "countryName")
            .populate("stateId", "stateName")
            .populate("cityId", "cityName")
            .populate("bankName", "bankName")
            .populate("salaryStructure", "name")
            .populate("userGroup", "groupName");

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        res.status(200).json({
            success: true,
            data: employee
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =========================
// ADD / EDIT EMPLOYEE
// =========================

module.exports.addEditEmployee = async (req, res) => {
    try {
        const { _id, ...employeeData } = req.body;

        // Encrypt password only when password is provided
        if (employeeData.password) {
            employeeData.password = await bcrypt.hash(
                employeeData.password,
                10
            );
        }

        let employee;

        // =========================
        // EDIT
        // =========================

        if (_id) {

            // Don't update password if it is empty
            if (!employeeData.password) {
                delete employeeData.password;
            }

            employee = await EmployeeMaster.findByIdAndUpdate(
                _id,
                employeeData,
                {
                    new: true,
                    runValidators: true
                }
            ).select("-password");

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Employee updated successfully",
                data: employee
            });
        }

        // =========================
        // ADD
        // =========================

        employee = await EmployeeMaster.create(
            employeeData
        );

        const employeeResponse =
            employee.toObject();

        delete employeeResponse.password;

        res.status(201).json({
            success: true,
            message: "Employee added successfully",
            data: employeeResponse
        });

    } catch (error) {

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Employee ID or username already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =========================
// DELETE EMPLOYEE
// =========================

module.exports.deleteEmployeeById = async (req, res) => {
    try {
        const { _id } = req.body;

        const employee =
            await EmployeeMaster.findByIdAndDelete(_id);

        if (!employee) {
            return res.status(404).json({
                success: false,
                message: "Employee not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


// =========================
// EMPLOYEE HELP / DROPDOWN
// =========================

module.exports.getEmployeeHelp = async (req, res) => {
    try {
        const employees = await EmployeeMaster.find(
            {
                isActive: true,
                employeeStatus: "ACTIVE"
            },
            {
                _id: 1,
                employeeId: 1,
                firstName: 1,
                middleName: 1,
                lastName: 1
            }
        ).sort({
            firstName: 1
        });

        const data = employees.map((employee) => ({
            _id: employee._id,
            employeeId: employee.employeeId,
            employeeName: [
                employee.firstName,
                employee.middleName,
                employee.lastName
            ]
                .filter(Boolean)
                .join(" ")
        }));

        res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};