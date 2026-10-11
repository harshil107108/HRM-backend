const Onboarding = require("../../modals/Recruitment/OnboardingModel");
const Candidate = require("../../modals/Recruitment/CandidateModel");
const JobOpening = require("../../modals/Recruitment/jobOpeningModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const Interview = require("../../modals/Recruitment/InterviewModel");
const OfferLetter = require("../../modals/Recruitment/OfferLetterModel");

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

        let existingOnboarding = null;
        if (_id) {
            existingOnboarding = await Onboarding.findById(_id);
            if (!existingOnboarding) {
                return res.status(404).json({
                    success: false,
                    message: "Onboarding record not found",
                });
            }
        }

        // Merge existing record with incoming updates for complete evaluation
        const mergedData = {
            ...(existingOnboarding ? existingOnboarding.toObject() : {}),
            ...onboardingData,
        };

        // Calculate progress percentage as data is filled:
        // - Candidate assigned: 10%
        // - Orientation Date set: 10%
        // - Mentor / Buddy assigned: 10%
        // - 5 Verification Checklists: 14% each (total 70%)
        // Total = 100%
        let progressScore = 0;
        if (mergedData.candidate) progressScore += 10;
        if (mergedData.orientationDate) progressScore += 10;
        if (mergedData.buddyEmployee) progressScore += 10;
        if (mergedData.documentsSubmitted) progressScore += 14;
        if (mergedData.backgroundCheckCompleted) progressScore += 14;
        if (mergedData.itAssetsAssigned) progressScore += 14;
        if (mergedData.bankDetailsVerified) progressScore += 14;
        if (mergedData.orientationCompleted) progressScore += 14;

        const calculatedProgress = Math.min(progressScore, 100);
        onboardingData.progressPercentage = calculatedProgress;

        // Requirement: Status can only be Completed if progress is 100%
        if (onboardingData.status === "Completed" && calculatedProgress < 100) {
            return res.status(400).json({
                success: false,
                message: `Cannot complete onboarding. Current progress is ${calculatedProgress}%. All onboarding data and checklist verifications must reach 100% before dropping or setting status to Completed.`,
            });
        }

        let onboarding;
        if (_id) {
            onboarding = await Onboarding.findByIdAndUpdate(_id, onboardingData, {
                new: true,
                runValidators: true,
            });
        } else {
            if (onboardingData.candidate) {
                onboarding = await Onboarding.findOneAndUpdate(
                    { candidate: onboardingData.candidate },
                    { $set: onboardingData },
                    { upsert: true, returnDocument: "after", runValidators: true }
                );
            } else {
                onboarding = await Onboarding.create(onboardingData);
            }
        }

        // Pipeline Linking: When Onboarding is "Completed"
        if (onboarding.status === "Completed") {
            try {
                const candId = onboarding.candidate;
                const joId = onboarding.jobOpening;

                const cand = await Candidate.findById(candId);
                const jo = joId ? await JobOpening.findById(joId) : null;

                if (cand) {
                    const candidateWasAlreadyHired = cand.stage === "Hired";

                    // 1. Mark candidate stage as Hired
                    cand.stage = "Hired";
                    await cand.save();

                    // 2. Atomically create EmployeeMaster if not existing for this email
                    let firstName = cand.firstName;
                    let middleName = cand.middleName || "";
                    let lastName = cand.lastName;

                    if (!firstName || !lastName) {
                        const names = (cand.candidateName || "New Employee").trim().split(/\s+/);
                        firstName = firstName || names[0] || "Employee";
                        middleName = middleName || (names.length > 2 ? names.slice(1, -1).join(" ") : "");
                        lastName = lastName || (names.length > 1 ? names.slice(1).join(" ") : names[0] || "Employee");
                    }

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

                    const createdEmployee = await EmployeeMaster.findOneAndUpdate(
                        {
                            $or: [
                                { officialEmail: cand.email.toLowerCase() },
                                { personalEmail: cand.email.toLowerCase() },
                            ],
                        },
                        {
                            $setOnInsert: {
                                employeeId: empId,
                                firstName,
                                middleName,
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
                                candidateId: cand._id,
                                permissions: {
                                    financialView: false,
                                    leaveApproval: true,
                                    orgChartAdmin: false,
                                    directoryAccess: true,
                                },
                            },
                        },
                        { upsert: true, returnDocument: "after" }
                    );

                    // Count direct onboarding hires, but don't count accepted offers twice.
                    if (jo && !candidateWasAlreadyHired) {
                        jo.filledPositions = (jo.filledPositions || 0) + 1;
                        if (jo.numberOfPositions && jo.filledPositions >= jo.numberOfPositions) {
                            jo.jobStatus = "FILLED";
                        }
                        await jo.save();
                    }

                    // 4. Delete candidate across all recruitment modules
                    // (Candidate, Interviews, Offer Letters, and Onboarding)
                    await Promise.all([
                        Candidate.findByIdAndDelete(candId),
                        Interview.deleteMany({ candidate: candId }),
                        OfferLetter.deleteMany({ candidate: candId }),
                        Onboarding.findByIdAndDelete(onboarding._id),
                    ]);

                    return res.status(200).json({
                        success: true,
                        message: `Onboarding completed! "${cand.candidateName || "Candidate"}" has been converted to an active Employee, and recruitment profile has been cleaned up across all modules.`,
                        data: {
                            convertedEmployee: createdEmployee,
                            isCleanedUp: true,
                        },
                    });
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
