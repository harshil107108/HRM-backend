const express = require("express");

const router = express.Router();

const departmentMasterController = require(
    "../../controllers/Organization/DepartmentMaster"
);


// =========================
// GET ALL DEPARTMENT
// =========================

router.post(
    "/getDepartment",
    departmentMasterController.getDepartment
);


// =========================
// GET DEPARTMENT BY ID
// =========================

router.post(
    "/getDepartmentById",
    departmentMasterController.getDepartmentById
);


// =========================
// DEPARTMENT HELP
// =========================

router.post(
    "/getDepartmentHelp",
    departmentMasterController.getDepartmentHelp
);


// =========================
// ADD / EDIT DEPARTMENT
// =========================

router.post(
    "/addEditDepartment",
    departmentMasterController.addEditDepartment
);


// =========================
// DELETE DEPARTMENT
// =========================

router.post(
    "/deleteDepartmentById",
    departmentMasterController.deleteDepartmentById
);


module.exports = router;