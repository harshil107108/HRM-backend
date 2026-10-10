const Onboarding = require("../../modals/Recruitment/OnboardingModel");
const Candidate = require("../../modals/Recruitment/CandidateModel");
const JobOpening = require("../../modals/Recruitment/jobOpeningModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");

module.exports.getOnboarding = async (req, res) => {
    try {
        const onboardings = await Onboarding.find({})
            .populate("candidate", "candidateName email phone stage currentDesignation")
            .populate("jobOpening", "jobTitle jobOpeningId company branch department designation targetJoiningDate")
            .populate("buddyEmployee", "employeeId firstName middleName lastName")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: onboardings,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getOnboardingById = async (req, res) => {
    try {
        const { _id } = req.body;
        const onboarding = await Onboarding.findById(_id)
            .populate("candidate", "candidateName email phone stage")
            .populate("jobOpening", "jobTitle company branch department designation")
            .populate("buddyEmployee", "employeeId firstName lastName");

        if (!onboarding) {
            return res.status(404).json({
                success: false,
                message: "Onboarding record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: onboarding,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditOnboarding = async (req, res) => {
    try {
        const { _id, ...onboardingData } = req.body;

        // Auto calculate progress percentage based on completed checklist items if present
        if (
            onboardingData.documentsSubmitted !== undefined ||
            onboardingData.backgroundCheckCompleted !== undefined ||
            onboardingData.itAssetsAssigned !== undefined ||
            onboardingData.bankDetailsVerified !== undefined ||
            onboardingData.orientationCompleted !== undefined
        ) {
            const checks = [
                onboardingData.documentsSubmitted,
                onboardingData.backgroundCheckCompleted,
                onboardingData.itAssetsAssigned,
                onboardingData.bankDetailsVerified,
                onboardingData.orientationCompleted,
            ];
            const completedCount = checks.filter(Boolean).length;
            onboardingData.progressPercentage = Math.round((completedCount / checks.length) * 100);

            if (onboardingData.progressPercentage === 100) {
                onboardingData.status = "Completed";
            }
        }

        let onboarding;
        if (_id) {
            onboarding = await Onboarding.findByIdAndUpdate(_id, onboardingData, {
                new: true,
                runValidators: true,
            });

            if (!onboarding) {
                return res.status(404).json({
                    success: false,
                    message: "Onboarding record not found",
                });
            }
        } else {
            onboarding = await Onboarding.create(onboardingData);
        }

        // Pipeline Linking: When Onboarding is "Completed"
        if (onboarding.status === "Completed") {
            try {
                const candId = onboarding.candidate;
                const joId = onboarding.jobOpening;

                const cand = await Candidate.findById(candId);
                const jo = joId ? await JobOpening.findById(joId) : null;

                if (cand) {
                    // 1. Mark candidate stage as Hired
                    cand.stage = "Hired";
                    await cand.save();

                    // 2. Check if an EmployeeMaster already exists for this email
                    const existingEmp = await EmployeeMaster.findOne({
                        $or: [
                            { officialEmail: cand.email.toLowerCase() },
                            { personalEmail: cand.email.toLowerCase() },
                        ],
                    });

                    if (!existingEmp) {
                        const names = (cand.candidateName || "New Employee").trim().split(/\s+/);
                        const firstName = names[0] || "Employee";
                        const lastName = names.slice(1).join(" ") || names[0];
                        const empId = `EMP${Math.floor(100000 + Math.random() * 900000)}`;

                        // Find sample employee for fallback IDs
                        const sampleEmp = await EmployeeMaster.findOne({});
                        const companyId = jo?.company || sampleEmp?.companyId || "6aca662a199e38a60b82f336";
                        const branchId = jo?.branch || sampleEmp?.branchId || "6a9ab23ef4695ead1908e2e5";
                        const departmentId = jo?.department || sampleEmp?.departmentId || "6a9ab2d0f4695ead1908e2e7";
                        const designationId = jo?.designation || sampleEmp?.designationId || "6a9ab35af4695ead1908e2e8";
                        const countryId = sampleEmp?.countryId || "6a9ab06ef4695ead1908e2dc";
                        const stateId = sampleEmp?.stateId || "6a9ab084f4695ead1908e2dd";
                        const cityId = sampleEmp?.cityId || "6a9ab0adf4695ead1908e2df";

                        await EmployeeMaster.create({
                            employeeId: empId,
                            firstName,
                            lastName,
                            gender: "male",
                            dateOfBirth: new Date("1998-01-01"),
                            companyId,
                            branchId,
                            departmentId,
                            designationId,
                            employmentType: "FULL_TIME",
                            employeeStatus: "ACTIVE",
                            joiningDate: onboarding.orientationDate || new Date(),
                            officialEmail: cand.email.toLowerCase(),
                            personalEmail: cand.email.toLowerCase(),
                            mobileNumber: cand.phone || "9876543210",
                            emergencyContactName: cand.candidateName || "Emergency Contact",
                            emergencyContactNumber: cand.phone || "9876543210",
                            countryId,
                            stateId,
                            cityId,
                            postalCode: "383235",
                            currentAddress: "Corporate Headquarters",
                            aadhaarNumber: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
                            panNumber: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
                            username: `${firstName.toLowerCase()}${Math.floor(100 + Math.random() * 900)}`,
                            password: "$2b$10$ig3Su1e6epk6/3YThaPJIuAlB2ihcGV/yu94B7lEgQdnuVv/CRnci",
                            primaryRole: "EMPLOYEE",
                            isActive: true,
                            permissions: {
                                financialView: false,
                                leaveApproval: true,
                                orgChartAdmin: false,
                                directoryAccess: true,
                            },
                        });
                    }
                }
            } catch (convErr) {
                console.error("Onboarding to Employee conversion error:", convErr);
            }
        }

        return res.status(_id ? 200 : 201).json({
            success: true,
            message: _id ? "Onboarding record updated successfully" : "Onboarding record created successfully",
            data: onboarding,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteOnboardingById = async (req, res) => {
    try {
        const { _id } = req.body;
        const onboarding = await Onboarding.findByIdAndDelete(_id);

        if (!onboarding) {
            return res.status(404).json({
                success: false,
                message: "Onboarding record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Onboarding record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
