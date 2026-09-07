const JobOpeningMaster = require("../../modals/Recruitment/jobOpeningModel");

// =========================================================
// GET ALL JOB OPENINGS
// =========================================================

module.exports.getJobOpening = async (req, res) => {
    try {
        const jobOpenings = await JobOpeningMaster.find({})
            .populate(
                "department",
                "departmentname departmentcode"
            )
            .populate(
                "designation",
                "designationname designationcode"
            )
            .populate(
                "company",
                "companyName companyCode"
            )
            .populate(
                "branch",
                "branchname branchcode"
            )
            .populate(
                "hiringManager",
                "firstName lastName employeeCode"
            )
            .populate(
                "recruiter",
                "firstName lastName employeeCode"
            )
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: jobOpenings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// GET JOB OPENING BY ID
// =========================================================

module.exports.getJobOpeningById = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "Job Opening ID is required",
            });
        }

        const jobOpening = await JobOpeningMaster.findById(_id)
            .populate(
                "department",
                "departmentname departmentcode"
            )
            .populate(
                "designation",
                "designationname designationcode"
            )
            .populate(
                "company",
                "companyName companyCode"
            )
            .populate(
                "branch",
                "branchname branchcode"
            )
            .populate(
                "hiringManager",
                "firstName lastName employeeCode"
            )
            .populate(
                "recruiter",
                "firstName lastName employeeCode"
            );

        if (!jobOpening) {
            return res.status(404).json({
                success: false,
                message: "Job Opening not found",
            });
        }

        res.status(200).json({
            success: true,
            data: jobOpening,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// ADD / EDIT JOB OPENING
// =========================================================

module.exports.addEditJobOpening = async (req, res) => {
    try {
        const {
            _id,

            // Job Information
            jobTitle,
            jobOpeningId,
            department,
            designation,
            company,
            branch,

            // Position Information
            numberOfPositions,
            employmentType,
            workMode,
            experienceRequired,
            minimumExperience,
            maximumExperience,

            // Hiring Information
            hiringManager,
            recruiter,
            priority,
            targetJoiningDate,

            // Salary Information
            salaryType,
            minimumSalary,
            maximumSalary,
            currency,

            // Job Description
            jobSummary,
            jobResponsibilities,
            requiredSkills,
            preferredSkills,
            qualifications,

            // Publishing Information
            jobStatus,
            publishDate,
            closingDate,
            publishOnCareerPage,
            allowInternalApplications,

            // Additional
            remarks,
        } = req.body;

        // =========================================================
        // REQUIRED VALIDATION
        // =========================================================

        if (!jobTitle) {
            return res.status(400).json({
                success: false,
                message: "Job Title is required",
            });
        }

        if (!department) {
            return res.status(400).json({
                success: false,
                message: "Department is required",
            });
        }

        if (!designation) {
            return res.status(400).json({
                success: false,
                message: "Designation is required",
            });
        }

        if (!company) {
            return res.status(400).json({
                success: false,
                message: "Company is required",
            });
        }

        if (!numberOfPositions) {
            return res.status(400).json({
                success: false,
                message: "Number of Positions is required",
            });
        }

        if (!employmentType) {
            return res.status(400).json({
                success: false,
                message: "Employment Type is required",
            });
        }

        if (!workMode) {
            return res.status(400).json({
                success: false,
                message: "Work Mode is required",
            });
        }

        // if (!hiringManager) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Hiring Manager is required",
        //     });
        // }

        if (!jobSummary) {
            return res.status(400).json({
                success: false,
                message: "Job Summary is required",
            });
        }

        if (!jobResponsibilities) {
            return res.status(400).json({
                success: false,
                message: "Job Responsibilities is required",
            });
        }

        // =========================================================
        // JOB OPENING DATA
        // =========================================================

        const jobOpeningData = {
            jobTitle: jobTitle.trim(),

            // Only use this when frontend provides it.
            // Otherwise generate it below.
            jobOpeningId: jobOpeningId
                ? jobOpeningId.trim().toUpperCase()
                : `JOB-${Date.now()}`,

            department,
            designation,
            company,
            branch: branch || null,

            numberOfPositions: Number(numberOfPositions),

            employmentType,
            workMode,
            experienceRequired: experienceRequired || "",

            minimumExperience:
                minimumExperience !== undefined &&
                minimumExperience !== ""
                    ? Number(minimumExperience)
                    : 0,

            maximumExperience:
                maximumExperience !== undefined &&
                maximumExperience !== ""
                    ? Number(maximumExperience)
                    : 0,
hiringManager: hiringManager || null,
recruiter: recruiter || null,

            priority: priority || "NORMAL",

            targetJoiningDate:
                targetJoiningDate || null,

            salaryType: salaryType || "",

            minimumSalary:
                minimumSalary !== undefined &&
                minimumSalary !== ""
                    ? Number(minimumSalary)
                    : 0,

            maximumSalary:
                maximumSalary !== undefined &&
                maximumSalary !== ""
                    ? Number(maximumSalary)
                    : 0,

            currency: currency || "INR",

            jobSummary: jobSummary.trim(),
            jobResponsibilities: jobResponsibilities.trim(),

            requiredSkills: requiredSkills || "",
            preferredSkills: preferredSkills || "",
            qualifications: qualifications || "",

            jobStatus: jobStatus || "DRAFT",

            publishDate: publishDate || null,
            closingDate: closingDate || null,

            publishOnCareerPage:
                publishOnCareerPage ?? false,

            allowInternalApplications:
                allowInternalApplications ?? false,

            remarks: remarks || "",
        };

        // =========================================================
        // EDIT
        // =========================================================

        if (_id) {
            const existingJobOpening =
                await JobOpeningMaster.findById(_id);

            if (!existingJobOpening) {
                return res.status(404).json({
                    success: false,
                    message: "Job Opening not found",
                });
            }

            const updatedJobOpening =
                await JobOpeningMaster.findByIdAndUpdate(
                    _id,
                    jobOpeningData,
                    {
                        new: true,
                        runValidators: true,
                    }
                );

            return res.status(200).json({
                success: true,
                message: "Job Opening updated successfully",
                data: updatedJobOpening,
            });
        }

        // =========================================================
        // ADD
        // =========================================================

        const newJobOpening =
            await JobOpeningMaster.create(
                jobOpeningData
            );

        res.status(201).json({
            success: true,
            message: "Job Opening added successfully",
            data: newJobOpening,
        });
    } catch (error) {
        // Duplicate Job Opening ID
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Job Opening ID already exists",
            });
        }

        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// DELETE JOB OPENING
// =========================================================

module.exports.deleteJobOpeningById = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({
                success: false,
                message: "Job Opening ID is required",
            });
        }

        const deletedJobOpening =
            await JobOpeningMaster.findByIdAndDelete(_id);

        if (!deletedJobOpening) {
            return res.status(404).json({
                success: false,
                message: "Job Opening not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Job Opening deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// =========================================================
// JOB OPENING HELP
// =========================================================

module.exports.getJobOpeningHelp = async (req, res) => {
    try {
        const jobOpenings =
            await JobOpeningMaster.find(
                { isActive: true },
                {
                    _id: 1,
                    jobTitle: 1,
                    jobOpeningId: 1,
                }
            ).sort({ jobTitle: 1 });

        res.status(200).json({
            success: true,
            data: jobOpenings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};