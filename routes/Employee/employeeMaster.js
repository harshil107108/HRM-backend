const express = require("express");

const router = express.Router();

const employeeMasterController = require("../../controllers/Employee/EmployeeMaster");

const uploadEmployeeImage = require("../../middlewares/multer");

router.post("/getEmployee", employeeMasterController.getEmployee);

router.post("/getEmployeeById", employeeMasterController.getEmployeeById);

router.post("/getEmployeeHelp", employeeMasterController.getEmployeeHelp);

router.post("/addEditEmployee", uploadEmployeeImage.single("profileImage"), employeeMasterController.addEditEmployee);

router.post("/deleteEmployeeById", employeeMasterController.deleteEmployeeById);

module.exports = router;