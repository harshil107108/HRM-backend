const express = require("express");

const router = express.Router();

const employeeMasterController = require("../../controllers/Employee/EmployeeMaster");

const uploadImage = require("../../middlewares/uploadImage");

router.post("/getEmployee", employeeMasterController.getEmployee);

router.post("/getEmployeeById", employeeMasterController.getEmployeeById);

router.post("/getEmployeeHelp", employeeMasterController.getEmployeeHelp);

router.post("/addEditEmployee", uploadImage("employees", "employee").single("profileImage"), employeeMasterController.addEditEmployee);

router.post("/deleteEmployeeById", employeeMasterController.deleteEmployeeById);

module.exports = router;