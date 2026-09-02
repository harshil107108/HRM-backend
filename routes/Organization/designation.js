const express = require("express");
const router = express.Router();
const designationMasterController = require("../../controllers/Organization/Designation");


// =========================
// DESIGNATION MASTER ROUTES
// =========================

router.post(
    "/getDesignation",
    designationMasterController.getDesignation
);

router.post(
    "/getDesignationById",
    designationMasterController.getDesignationById
);

router.post(
    "/getDesignationHelp",
    designationMasterController.getDesignationHelp
);

router.post(
    "/addEditDesignation",
    designationMasterController.addEditDesignation
);

router.post(
    "/deleteDesignationById",
    designationMasterController.deleteDesignationById
);


module.exports = router;