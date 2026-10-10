const Review = require("../../modals/Performance/ReviewModel");

module.exports.getReviews = async (req, res) => {
    try {
        const reviews = await Review.find({})
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail departmentId branchId")
            .populate("reviewerId", "employeeId firstName lastName")
            .sort({ reviewDate: -1 });

        res.status(200).json({
            success: true,
            data: reviews,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getReviewById = async (req, res) => {
    try {
        const { _id } = req.body;
        const review = await Review.findById(_id)
            .populate("employeeId", "employeeId firstName lastName")
            .populate("reviewerId", "employeeId firstName lastName");

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Performance review not found",
            });
        }

        res.status(200).json({
            success: true,
            data: review,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditReview = async (req, res) => {
    try {
        const { _id, ...reviewData } = req.body;

        const s = Number(reviewData.selfRating || 4);
        const m = Number(reviewData.managerRating || 4);
        reviewData.finalRating = Math.round(((s + m) / 2) * 10) / 10;

        if (_id) {
            const review = await Review.findByIdAndUpdate(_id, reviewData, {
                new: true,
                runValidators: true,
            });

            if (!review) {
                return res.status(404).json({
                    success: false,
                    message: "Performance review not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Performance review updated successfully",
                data: review,
            });
        }

        const review = await Review.create(reviewData);
        res.status(201).json({
            success: true,
            message: "Performance review submitted successfully",
            data: review,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteReviewById = async (req, res) => {
    try {
        const { _id } = req.body;
        const review = await Review.findByIdAndDelete(_id);

        if (!review) {
            return res.status(404).json({
                success: false,
                message: "Performance review not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Performance review deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
