const bcrypt = require("bcryptjs");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const getUploadPath = (file) => `/uploads/employees/${file.filename}`;

module.exports.getEmployee = async (req, res) => {
    try {
        const employees = await EmployeeMaster.find({})
            .select("-password")
            .populate("companyId", "companyName companyCode")
            .populate("branchId", "branchname branchcode")
            .populate("departmentId", "departmentname departmentcode")
            .populate("designationId", "designationname designationcode")
            .populate(
                "reportingManager",
                "employeeId firstName middleName lastName"
            )
            .populate("countryId", "countryName")
            .populate("stateId", "stateName")
            .populate("cityId", "cityName")
            .populate("bankName", "bankName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: employees,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


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

module.exports.addEditEmployee = async (req, res) => {
    try {

        const { _id, ...employeeData } = req.body;

        if (employeeData.permissions) {
            try {
                employeeData.permissions =
                    JSON.parse(employeeData.permissions);
            } catch (error) {
                employeeData.permissions = {};
            }
        }

        if (employeeData.password) {
            employeeData.password = await bcrypt.hash(
                employeeData.password,
                10
            );
        }

        if (req.files) {
            if (req.files.profileImage?.[0]) {
                employeeData.profileImage = getUploadPath(req.files.profileImage[0]);
            }

            if (req.files.resume?.[0]) {
                employeeData.resume = getUploadPath(req.files.resume[0]);
            }

            if (req.files.offerLetter?.[0]) {
                employeeData.offerLetter = getUploadPath(req.files.offerLetter[0]);
            }

            if (req.files.appointmentLetter?.[0]) {
                employeeData.appointmentLetter = getUploadPath(req.files.appointmentLetter[0]);
            }

            if (req.files.otherDocuments?.[0]) {
                employeeData.otherDocuments = getUploadPath(req.files.otherDocuments[0]);
            }
        }

        if (_id) {

            if (!employeeData.password) { delete employeeData.password; }
            const employee =
                await EmployeeMaster.findByIdAndUpdate(
                    _id,
                    employeeData,
                    {
                        new: true,
                        runValidators: true,
                    }
                ).select("-password");

            if (!employee) {
                return res.status(404).json({
                    success: false,
                    message: "Employee not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Employee updated successfully",
                data: employee,
            });
        }

        const employee = await EmployeeMaster.create(employeeData);
        const employeeResponse = employee.toObject();
        delete employeeResponse.password;

        return res.status(201).json({
            success: true,
            message: "Employee added successfully",
            data: employeeResponse,
        });

    } catch (error) {

        console.error("Employee Add/Edit Error:", error);

        if (error.code === 11000) {
            const duplicateField = Object.keys(error.keyPattern || {})[0];

            return res.status(409).json({
                success: false,
                message: `${duplicateField || "Employee"} already exists`,
            });
        }

        if (error.name === "ValidationError") {
            const errors = Object.values(error.errors).map((err) => err.message);

            return res.status(400).json({
                success: false,
                message: errors.join(", "),
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteEmployeeById = async (req, res) => {
    try {
        const { _id } = req.body;
        const employee = await EmployeeMaster.findByIdAndDelete(_id);
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