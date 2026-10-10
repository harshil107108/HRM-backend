const express = require("express");
const router = express.Router();
const appraisalController = require("../../controllers/Performance/Appraisal");

router.post("/getAppraisals", appraisalController.getAppraisals);
router.post("/getAppraisalById", appraisalController.getAppraisalById);
router.post("/addEditAppraisal", appraisalController.addEditAppraisal);
router.post("/deleteAppraisalById", appraisalController.deleteAppraisalById);

module.exports = router;
