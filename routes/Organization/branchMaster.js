const express = require("express");
const router = express.Router();
const branchMasterController = require("../../controllers/Organization/BranchMaster");
const uploadImage = require("../../middlewares/uploadImage");


router.post("/getBranch", branchMasterController.getBranch);
router.post("/getBranchById", branchMasterController.getBranchById);
router.post("/getBranchHelp", branchMasterController.getBranchHelp);
router.post("/addEditBranch", uploadImage("branches", "branch").single("branchImage"), branchMasterController.addEditBranch);
router.post("/deleteBranchById", branchMasterController.deleteBranchById);

module.exports = router;