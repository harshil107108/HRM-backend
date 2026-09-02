const DesignationMaster = require("../../modals/Organization/DesignationMaster");


// =========================
// GET DESIGNATION LIST
// =========================

module.exports.getDesignation = async (req, res) => {
    try {
        const designations = await DesignationMaster.find()
            .populate(
                "company",
                "companyName companyCode"
            )
            .populate(
                "branch",
                "branchname branchcode"
            )
            .populate(
                "department",
                "departmentname departmentcode"
            )
            .populate(
                "reportingManagerId",
                "firstName middleName lastName employeeId"
            )
            .populate(
                "skipLevelManagerId",
                "firstName middleName lastName employeeId"
            )
            .populate(
                "departmentHeadId",
                "firstName middleName lastName employeeId"
            )
            .populate(
                "mentorId",
                "firstName middleName lastName employeeId"
            )
            .sort({
                designationname: 1,
            });

        res.status(200).json({
            success: true,
            data: designations,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =========================
// GET DESIGNATION BY ID
// =========================

module.exports.getDesignationById = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "Designation ID is required",
            });
        }

        const designation =
            await DesignationMaster.findById(_id)
                .populate(
                    "company",
                    "companyName companyCode"
                )
                .populate(
                    "branch",
                    "branchname branchcode"
                )
                .populate(
                    "department",
                    "departmentname departmentcode"
                )
                .populate(
                    "reportingManagerId",
                    "firstName middleName lastName employeeId"
                )
                .populate(
                    "skipLevelManagerId",
                    "firstName middleName lastName employeeId"
                )
                .populate(
                    "departmentHeadId",
                    "firstName middleName lastName employeeId"
                )
                .populate(
                    "mentorId",
                    "firstName middleName lastName employeeId"
                );

        if (!designation) {
            return res.status(404).json({
                success: false,
                message: "Designation not found",
            });
        }

        res.status(200).json({
            success: true,
            data: designation,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =========================
// ADD / EDIT DESIGNATION
// =========================

module.exports.addEditDesignation = async (req, res) => {
    try {
        const {
            _id,

            // =========================
            // BASIC INFORMATION
            // =========================

            designationname,
            designationcode,
            shortname,
            description,

            // =========================
            // JOB ASSIGNMENT
            // =========================

            company,
            branch,
            department,
            businessUnitId,

            // =========================
            // EMPLOYMENT
            // =========================

            employmentType,
            employmentStatus,
            joiningDate,
            confirmationDate,
            probationPeriod,
            noticePeriod,

            // =========================
            // REPORTING STRUCTURE
            // =========================

            reportingManagerId,
            skipLevelManagerId,
            departmentHeadId,
            mentorId,

            // =========================
            // GRADE
            // =========================

            jobGrade,
            jobLevel,
            band,
            salaryGrade,

            // =========================
            // WORK
            // =========================

            workingShift,
            holidayCalendar,
            weeklyOff,
            attendancePolicy,
            officialEmail,
            officialPhone,
            extensionNumber,
            workMode,

            // =========================
            // PAYROLL
            // =========================

            payrollGroup,
            defaultRole,
            accessLevel,
            userAccount,

            // =========================
            // PAYROLL TOGGLES
            // =========================

            overtimeEligible,
            bonusEligible,
            pfApplicable,
            esiApplicable,
            professionalTaxApplicable,

            // =========================
            // STATUS
            // =========================

            isActive,
        } = req.body;


        // =========================
        // REQUIRED VALIDATION
        // =========================

        if (!designationname?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Designation name is required",
            });
        }

        if (!designationcode?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Designation code is required",
            });
        }

        if (!shortname?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Short name is required",
            });
        }


        // =========================
        // JOB ASSIGNMENT VALIDATION
        // =========================

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "Company is required",
            });
        }

        if (!branch) {
            return res.status(400).json({
                success: false,
                message: "Branch is required",
            });
        }

        if (!department) {
            return res.status(400).json({
                success: false,
                message: "Department is required",
            });
        }


        // =========================
        // DESIGNATION DATA
        // =========================

        const designationData = {

            // =========================
            // BASIC INFORMATION
            // =========================

            designationname:
                designationname.trim(),

            designationcode:
                designationcode.trim().toUpperCase(),

            shortname:
                shortname.trim(),

            description:
                description?.trim() || "",


            // =========================
            // JOB ASSIGNMENT
            // =========================

            company,

            branch,

            department,

            businessUnitId:
                businessUnitId || null,


            // =========================
            // EMPLOYMENT
            // =========================

            employmentType:
                employmentType || "",

            employmentStatus:
                employmentStatus || "",

            joiningDate:
                joiningDate || null,

            confirmationDate:
                confirmationDate || null,

            probationPeriod:
                probationPeriod || "",

            noticePeriod:
                noticePeriod || "",


            // =========================
            // REPORTING STRUCTURE
            // =========================

            reportingManagerId:
                reportingManagerId || null,

            skipLevelManagerId:
                skipLevelManagerId || null,

            departmentHeadId:
                departmentHeadId || null,

            mentorId:
                mentorId || null,


            // =========================
            // GRADE
            // =========================

            jobGrade:
                jobGrade || "",

            jobLevel:
                jobLevel || "",

            band:
                band || "",

            salaryGrade:
                salaryGrade || "",


            // =========================
            // WORK
            // =========================

            workingShift:
                workingShift || "",

            holidayCalendar:
                holidayCalendar || null,

            weeklyOff:
                Array.isArray(weeklyOff)
                    ? weeklyOff
                    : [],

            attendancePolicy:
                attendancePolicy || "",

            officialEmail:
                officialEmail || "",

            officialPhone:
                officialPhone || "",

            extensionNumber:
                extensionNumber || "",

            workMode:
                workMode || "",


            // =========================
            // PAYROLL
            // =========================

            payrollGroup:
                payrollGroup || "",

            defaultRole:
                defaultRole || "",

            accessLevel:
                accessLevel || "",

            userAccount:
                userAccount || "",


            // =========================
            // PAYROLL TOGGLES
            // =========================

            overtimeEligible:
                overtimeEligible !== undefined
                    ? overtimeEligible
                    : true,

            bonusEligible:
                bonusEligible !== undefined
                    ? bonusEligible
                    : true,

            pfApplicable:
                pfApplicable !== undefined
                    ? pfApplicable
                    : true,

            esiApplicable:
                esiApplicable !== undefined
                    ? esiApplicable
                    : false,

            professionalTaxApplicable:
                professionalTaxApplicable !== undefined
                    ? professionalTaxApplicable
                    : true,
        };


        // =========================
        // STATUS
        // =========================

        if (isActive !== undefined) {
            designationData.isActive = isActive;
        }


        // =========================
        // UPDATE
        // =========================

        if (_id) {

            const designation =
                await DesignationMaster.findByIdAndUpdate(
                    _id,
                    designationData,
                    {
                        new: true,
                        runValidators: true,
                    }
                );

            if (!designation) {
                return res.status(404).json({
                    success: false,
                    message: "Designation not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Designation updated successfully",
                data: designation,
            });
        }


        // =========================
        // CREATE
        // =========================

        const designation =
            await DesignationMaster.create(
                designationData
            );

        res.status(201).json({
            success: true,
            message: "Designation created successfully",
            data: designation,
        });

    } catch (error) {

        // =========================
        // DUPLICATE DESIGNATION CODE
        // =========================

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Designation code already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =========================
// DELETE DESIGNATION
// =========================

module.exports.deleteDesignationById = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "Designation ID is required",
            });
        }

        const designation =
            await DesignationMaster.findByIdAndDelete(_id);

        if (!designation) {
            return res.status(404).json({
                success: false,
                message: "Designation not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Designation deleted successfully",
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};


// =========================
// DESIGNATION HELP
// =========================

module.exports.getDesignationHelp = async (req, res) => {
    try {
        const designations =
            await DesignationMaster.find(
                {
                    isActive: true,
                },
                {
                    _id: 1,
                    designationname: 1,
                    designationcode: 1,
                    shortname: 1,
                }
            )
                .sort({
                    designationname: 1,
                });

        res.status(200).json({
            success: true,
            data: designations,
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};