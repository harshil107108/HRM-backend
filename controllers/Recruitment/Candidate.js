const Candidate = require("../../modals/Recruitment/CandidateModel");
const Interview = require("../../modals/Recruitment/InterviewModel");
const OfferLetter = require("../../modals/Recruitment/OfferLetterModel");
const Onboarding = require("../../modals/Recruitment/OnboardingModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");

module.exports.getCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.find({})
            .populate("jobOpening", "jobTitle jobOpeningId")
            .populate("convertedEmployeeId", "employeeId firstName lastName officialEmail")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: candidates,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getCandidateById = async (req, res) => {
    try {
        const { _id } = req.body;
        const candidate = await Candidate.findById(_id)
            .populate("jobOpening", "jobTitle jobOpeningId department designation")
            .populate("convertedEmployeeId", "employeeId firstName lastName officialEmail");

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        res.status(200).json({
            success: true,
            data: candidate,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditCandidate = async (req, res) => {
    try {
        const { _id, ...candidateData } = req.body;

        // Ensure candidateName is computed from firstName, middleName, lastName
        if (candidateData.firstName !== undefined || candidateData.lastName !== undefined) {
            candidateData.candidateName = [
                candidateData.firstName || "",
                candidateData.middleName || "",
                candidateData.lastName || ""
            ].filter(Boolean).join(" ");
        } else if (candidateData.candidateName && (!candidateData.firstName || !candidateData.lastName)) {
            const parts = candidateData.candidateName.trim().split(/\s+/);
            candidateData.firstName = parts[0] || "Candidate";
            candidateData.middleName = parts.length > 2 ? parts.slice(1, -1).join(" ") : "";
            candidateData.lastName = parts.length > 1 ? parts[parts.length - 1] : "Candidate";
        }

        let candidate;
        if (_id) {
            candidate = await Candidate.findByIdAndUpdate(_id, candidateData, {
                new: true,
                runValidators: true,
            });

            if (!candidate) {
                return res.status(404).json({
                    success: false,
                    message: "Candidate not found",
                });
            }
        } else {
            candidate = await Candidate.create(candidateData);
        }

        // Pipeline Linking: When candidate stage is "Interview"
        if (candidateData.stage === "Interview" || candidate.stage === "Interview") {
            try {
                const candId = candidate._id;
                const joId = candidate.jobOpening;

                if (candId && joId) {
                    const sampleEmp = await EmployeeMaster.findOne({ isActive: true });
                    if (sampleEmp) {
                        await Interview.findOneAndUpdate(
                            { candidate: candId },
                            {
                                $setOnInsert: {
                                    candidate: candId,
                                    jobOpening: joId,
                                    interviewer: sampleEmp._id,
                                    roundName: "Technical Round 1",
                                    scheduledDate: new Date(Date.now() + 2 * 86400000),
                                    status: "Scheduled",
                                    recommendation: "Pending",
                                }
                            },
                            { upsert: true, returnDocument: "after" }
                        );
                    }
                }
            } catch (syncErr) {
                console.error("Candidate Interview sync notice:", syncErr);
            }
        }

        return res.status(_id ? 200 : 201).json({
            success: true,
            message: _id ? "Candidate updated successfully" : "Candidate added successfully",
            data: candidate,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteCandidateById = async (req, res) => {
    try {
        const { _id } = req.body;
        const candidate = await Candidate.findByIdAndDelete(_id);

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found",
            });
        }

        // Clean up linked recruitment records across all modules
        await Promise.all([
            Interview.deleteMany({ candidate: _id }),
            OfferLetter.deleteMany({ candidate: _id }),
            Onboarding.deleteMany({ candidate: _id }),
        ]);

        res.status(200).json({
            success: true,
            message: "Candidate and associated recruitment records deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getCandidateHelp = async (req, res) => {
    try {
        const candidates = await Candidate.find(
            {},
            { _id: 1, firstName: 1, middleName: 1, lastName: 1, candidateName: 1, email: 1, stage: 1 }
        ).sort({ candidateName: 1, firstName: 1 });

        res.status(200).json({
            success: true,
            data: candidates,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
