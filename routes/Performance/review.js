const express = require("express");
const router = express.Router();
const reviewController = require("../../controllers/Performance/Review");

router.post("/getReviews", reviewController.getReviews);
router.post("/getReviewById", reviewController.getReviewById);
router.post("/addEditReview", reviewController.addEditReview);
router.post("/deleteReviewById", reviewController.deleteReviewById);

module.exports = router;
