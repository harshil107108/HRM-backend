const Interview = require("../../modals/Recruitment/InterviewModel");
const Candidate = require("../../modals/Recruitment/CandidateModel");
const OfferLetter = require("../../modals/Recruitment/OfferLetterModel");
const JobOpening = require("../../modals/Recruitment/jobOpeningModel");

module.exports.getInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find({})
            .populate("candidate", "candidateName email phone stage currentDesignation expectedSalary")
            .populate("jobOpening", "jobTitle jobOpeningId department designation company branch targetJoiningDate minimumSalary maximumSalary")
            .populate("interviewer", "employeeId firstName middleName lastName")
            .sort({ scheduledDate: -1 });

        res.status(200).json({
            success: true,
            data: interviews,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getInterviewById = async (req, res) => {
    try {
        const { _id } = req.body;
        const interview = await Interview.findById(_id)
            .populate("candidate", "candidateName email phone stage")
            .populate("jobOpening", "jobTitle jobOpeningId department designation")
            .populate("interviewer", "employeeId firstName lastName");

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: "Interview not found",
            });
        }

        res.status(200).json({
            success: true,
            data: interview,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditInterview = async (req, res) => {
    try {
        const { _id, ...interviewData } = req.body;

        let interview;
        if (_id) {
            interview = await Interview.findByIdAndUpdate(_id, interviewData, {
                new: true,
                runValidators: true,
            });

            if (!interview) {
                return res.status(404).json({
                    success: false,
                    message: "Interview not found",
                });
            }
        } else {
            interview = await Interview.create(interviewData);
        }

        // Pipeline Linking: When interview recommendation is "Hire" or "Strong Hire"
        if (
            interviewData.recommendation === "Hire" ||
            interviewData.recommendation === "Strong Hire" ||
            req.body.isHired === true
        ) {
            try {
                const candId = interview.candidate;
                const joId = interview.jobOpening;

                // 1. Update candidate stage to "Offered"
                if (candId) {
                    await Candidate.findByIdAndUpdate(candId, { stage: "Offered" });
                }

                // 2. Check if an offer letter already exists for this candidate
                const existingOffer = await OfferLetter.findOne({ candidate: candId });
                if (!existingOffer && candId && joId) {
                    const jo = await JobOpening.findById(joId);
                    const cand = await Candidate.findById(candId);
                    if (jo) {
                        await OfferLetter.create({
                            candidate: candId,
                            jobOpening: joId,
                            offeredDesignation: jo.designation,
                            offeredDepartment: jo.department,
                            offeredCtc: (cand && cand.expectedSalary) || jo.maximumSalary || 600000,
                            joiningDate: jo.targetJoiningDate || new Date(Date.now() + 15 * 86400000),
                            validUntil: new Date(Date.now() + 7 * 86400000),
                            status: "Draft",
                            remarks: "Candidate selected from interview process.",
                        });
                    }
                }
            } catch (syncErr) {
                console.error("Interview Hire sync notice:", syncErr);
            }
        } else if (interviewData.recommendation === "Reject") {
            try {
                if (interview.candidate) {
                    await Candidate.findByIdAndUpdate(interview.candidate, { stage: "Rejected" });
                }
            } catch (rejectErr) {
                console.error("Interview Reject sync notice:", rejectErr);
            }
        }

        return res.status(_id ? 200 : 201).json({
            success: true,
            message: _id ? "Interview updated successfully" : "Interview scheduled successfully",
            data: interview,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteInterviewById = async (req, res) => {
    try {
        const { _id } = req.body;
        const interview = await Interview.findByIdAndDelete(_id);

        if (!interview) {
            return res.status(404).json({
                success: false,
                message: "Interview not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Interview deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
