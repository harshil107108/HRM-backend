const OfferLetter = require("../../modals/Recruitment/OfferLetterModel");
const Candidate = require("../../modals/Recruitment/CandidateModel");
const Onboarding = require("../../modals/Recruitment/OnboardingModel");

module.exports.getOfferLetters = async (req, res) => {
    try {
        const offers = await OfferLetter.find({})
            .populate("candidate", "candidateName email phone stage")
            .populate("jobOpening", "jobTitle jobOpeningId company branch department designation targetJoiningDate")
            .populate("offeredDesignation", "designationname designationcode")
            .populate("offeredDepartment", "departmentname departmentcode")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: offers,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getOfferLetterById = async (req, res) => {
    try {
        const { _id } = req.body;
        const offer = await OfferLetter.findById(_id)
            .populate("candidate", "candidateName email phone stage")
            .populate("jobOpening", "jobTitle company branch department designation")
            .populate("offeredDesignation", "designationname")
            .populate("offeredDepartment", "departmentname");

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: "Offer letter not found",
            });
        }

        res.status(200).json({
            success: true,
            data: offer,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditOfferLetter = async (req, res) => {
    try {
        const { _id, ...offerData } = req.body;

        let offer;
        if (_id) {
            offer = await OfferLetter.findByIdAndUpdate(_id, offerData, {
                new: true,
                runValidators: true,
            });

            if (!offer) {
                return res.status(404).json({
                    success: false,
                    message: "Offer letter not found",
                });
            }
        } else {
            offer = await OfferLetter.create(offerData);
        }

        // Pipeline Linking: When offer letter is "Accepted"
        if (offerData.status === "Accepted") {
            try {
                const candId = offer.candidate;
                const joId = offer.jobOpening;

                // 1. Update candidate stage to "Hired"
                if (candId) {
                    await Candidate.findByIdAndUpdate(candId, { stage: "Hired" });
                }

                // 2. Check if an onboarding record already exists for this candidate
                const existingOnboarding = await Onboarding.findOne({ candidate: candId });
                if (!existingOnboarding && candId) {
                    await Onboarding.create({
                        candidate: candId,
                        jobOpening: joId,
                        orientationDate: offer.joiningDate || new Date(Date.now() + 7 * 86400000),
                        status: "In Progress",
                        progressPercentage: 20,
                        notes: "Offer letter accepted by candidate. Automatically moved to Onboarding.",
                    });
                }
            } catch (syncErr) {
                console.error("Offer Accept sync notice:", syncErr);
            }
        }

        return res.status(_id ? 200 : 201).json({
            success: true,
            message: _id ? "Offer letter updated successfully" : "Offer letter created successfully",
            data: offer,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteOfferLetterById = async (req, res) => {
    try {
        const { _id } = req.body;
        const offer = await OfferLetter.findByIdAndDelete(_id);

        if (!offer) {
            return res.status(404).json({
                success: false,
                message: "Offer letter not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Offer letter deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
