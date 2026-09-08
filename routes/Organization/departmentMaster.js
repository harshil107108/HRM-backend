const express = require("express");
const router = express.Router();
const departmentMasterController = require("../../controllers/Organization/DepartmentMaster");

router.post( "/getDepartment", departmentMasterController.getDepartment );
router.post( "/getDepartmentById", departmentMasterController.getDepartmentById );
router.post( "/getDepartmentHelp", departmentMasterController.getDepartmentHelp );
router.post( "/addEditDepartment", departmentMasterController.addEditDepartment );
router.post( "/deleteDepartmentById", departmentMasterController.deleteDepartmentById );

module.exports = router;