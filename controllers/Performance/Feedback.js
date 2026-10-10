const Feedback = require("../../modals/Performance/FeedbackModel");

module.exports.getFeedbacks = async (req, res) => {
    try {
        const feedbacks = await Feedback.find({})
            .populate("givenBy", "employeeId firstName middleName lastName officialEmail")
            .populate("givenTo", "employeeId firstName middleName lastName officialEmail")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            data: feedbacks,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getFeedbackById = async (req, res) => {
    try {
        const { _id } = req.body;
        const feedback = await Feedback.findById(_id)
            .populate("givenBy", "employeeId firstName lastName")
            .populate("givenTo", "employeeId firstName lastName");

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: "Feedback record not found",
            });
        }

        res.status(200).json({
            success: true,
            data: feedback,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditFeedback = async (req, res) => {
    try {
        const { _id, ...feedbackData } = req.body;

        if (_id) {
            const feedback = await Feedback.findByIdAndUpdate(_id, feedbackData, {
                new: true,
                runValidators: true,
            });

            if (!feedback) {
                return res.status(404).json({
                    success: false,
                    message: "Feedback record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Feedback updated successfully",
                data: feedback,
            });
        }

        const feedback = await Feedback.create(feedbackData);
        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully",
            data: feedback,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteFeedbackById = async (req, res) => {
    try {
        const { _id } = req.body;
        const feedback = await Feedback.findByIdAndDelete(_id);

        if (!feedback) {
            return res.status(404).json({
                success: false,
                message: "Feedback record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Feedback deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
