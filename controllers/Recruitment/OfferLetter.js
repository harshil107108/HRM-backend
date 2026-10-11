const OfferLetter = require("../../modals/Recruitment/OfferLetterModel");
const Candidate = require("../../modals/Recruitment/CandidateModel");
const Onboarding = require("../../modals/Recruitment/OnboardingModel");
const JobOpening = require("../../modals/Recruitment/jobOpeningModel");

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

        // Enforce requirement: Status can only become Accepted or Declined if previously Sent
        if (offerData.status === "Accepted" || offerData.status === "Declined") {
            if (!_id) {
                return res.status(400).json({
                    success: false,
                    message: "A new offer letter must be 'Sent' before it can be Accepted or Declined.",
                });
            }
            const existingOffer = await OfferLetter.findById(_id);
            if (!existingOffer) {
                return res.status(404).json({
                    success: false,
                    message: "Offer letter not found",
                });
            }
            if (existingOffer.status !== "Sent" && existingOffer.status !== "Accepted" && existingOffer.status !== "Declined") {
                return res.status(400).json({
                    success: false,
                    message: `Offer letter is currently in "${existingOffer.status}". It must be marked as "Sent" before it can be Accepted or Declined.`,
                });
            }
        }

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
            if (offerData.candidate) {
                offer = await OfferLetter.findOneAndUpdate(
                    { candidate: offerData.candidate },
                    { $set: offerData },
                    { upsert: true, returnDocument: "after", runValidators: true }
                );
            } else {
                offer = await OfferLetter.create(offerData);
            }
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

                // Count each accepted offer once so repeated saves cannot overfill the job.
                const offerToCount = await OfferLetter.findOneAndUpdate(
                    { _id: offer._id, positionCounted: { $ne: true } },
                    { $set: { positionCounted: true } },
                    { new: true },
                );

                if (offerToCount) {
                    try {
                        if (!joId) {
                            throw new Error("Job Opening is required to count an accepted offer");
                        }

                        const jobOpening = await JobOpening.findByIdAndUpdate(
                            joId,
                            { $inc: { filledPositions: 1 } },
                            { new: true },
                        );

                        if (!jobOpening) {
                            throw new Error("Job Opening not found for accepted offer");
                        }

                        if (jobOpening.filledPositions >= jobOpening.numberOfPositions) {
                            await JobOpening.findByIdAndUpdate(joId, {
                                $set: { jobStatus: "FILLED" },
                            });
                        }
                    } catch (error) {
                        await OfferLetter.findByIdAndUpdate(offer._id, {
                            $set: { positionCounted: false },
                        });
                        throw error;
                    }
                }

                // 2. Atomically create onboarding record if not existing
                if (candId) {
                    await Onboarding.findOneAndUpdate(
                        { candidate: candId },
                        {
                            $setOnInsert: {
                                candidate: candId,
                                jobOpening: joId,
                                orientationDate: offer.joiningDate || new Date(Date.now() + 7 * 86400000),
                                status: "In Progress",
                                progressPercentage: 20,
                                notes: "Offer letter accepted by candidate. Automatically moved to Onboarding.",
                            }
                        },
                        { upsert: true, returnDocument: "after" }
                    );
                }
            } catch (syncErr) {
                console.error("Offer Accept sync notice:", syncErr);
                throw syncErr;
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
