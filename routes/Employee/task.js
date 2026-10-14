const express = require("express");
const router = express.Router();
const taskController = require("../../controllers/Employee/Task");
const { authenticate, authorizeRequest } = require("../../middlewares/auth");

router.use(authenticate, authorizeRequest);
router.post("/getTasks", taskController.getTasks);
router.post("/getAssignableEmployees", taskController.getAssignableEmployees);
router.post("/getProjects", taskController.getProjects);
router.post("/addEditProject", taskController.addEditProject);
router.post("/deleteProject", taskController.deleteProject);
router.post("/createTask", taskController.createTask);
router.post("/updateTaskStatus", taskController.updateTaskStatus);
router.post("/deleteTask", taskController.deleteTask);

module.exports = router;
