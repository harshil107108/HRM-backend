const express = require("express");
const router = express.Router();
const goalController = require("../../controllers/Performance/Goal");

router.post("/getGoals", goalController.getGoals);
router.post("/getGoalById", goalController.getGoalById);
router.post("/addEditGoal", goalController.addEditGoal);
router.post("/deleteGoalById", goalController.deleteGoalById);

module.exports = router;
