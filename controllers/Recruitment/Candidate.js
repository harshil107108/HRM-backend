const Candidate = require("../../modals/Recruitment/CandidateModel");

module.exports.getCandidates = async (req, res) => {
    try {
        const candidates = await Candidate.find({})
            .populate("jobOpening", "jobTitle jobOpeningId")
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
            .populate("jobOpening", "jobTitle jobOpeningId department designation");

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

        if (_id) {
            const candidate = await Candidate.findByIdAndUpdate(_id, candidateData, {
                new: true,
                runValidators: true,
            });

            if (!candidate) {
                return res.status(404).json({
                    success: false,
                    message: "Candidate not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Candidate updated successfully",
                data: candidate,
            });
        }

        const candidate = await Candidate.create(candidateData);
        res.status(201).json({
            success: true,
            message: "Candidate added successfully",
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

        res.status(200).json({
            success: true,
            message: "Candidate deleted successfully",
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
            { _id: 1, candidateName: 1, email: 1, stage: 1 }
        ).sort({ candidateName: 1 });

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
