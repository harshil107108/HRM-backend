const express = require("express");
const router = express.Router();
const candidateController = require("../../controllers/Recruitment/Candidate");

router.post("/getCandidates", candidateController.getCandidates);
router.post("/getCandidateById", candidateController.getCandidateById);
router.post("/addEditCandidate", candidateController.addEditCandidate);
router.post("/deleteCandidateById", candidateController.deleteCandidateById);
router.post("/getCandidateHelp", candidateController.getCandidateHelp);

module.exports = router;
