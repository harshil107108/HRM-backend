const mongoose = require("mongoose");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const Task = require("../../modals/Employee/TaskModel");
const Project = require("../../modals/Employee/ProjectModel");
const DayReport = require("../../modals/Employee/DayReportModel");

const TASK_STATUSES = ["Assigned", "Running", "Code Review", "Completed"];
const CREATOR_ROLES = new Set(["ADMIN", "MANAGER", "SUPER_ADMIN"]);

const isAdmin = (user) =>
    user.isSuperAdmin || ["ADMIN", "SUPER_ADMIN"].includes(user.roleCode);

const canCreateTasks = (user) =>
    isAdmin(user) || CREATOR_ROLES.has(user.roleCode);

const getTeamEmployeeIds = async (managerId) => {
    const employees = await EmployeeMaster.find({ reportingManager: managerId })
        .select("_id")
        .lean();
    return employees.map((employee) => employee._id);
};

const getTaskScope = async (user) => {
    if (isAdmin(user)) return {};
    if (user.roleCode === "MANAGER") {
        const teamIds = await getTeamEmployeeIds(user.employee._id);
        return {
            $or: [
                { createdBy: user.employee._id },
                { assignedTo: user.employee._id },
                { assignedTo: { $in: teamIds } },
            ],
        };
    }
    return {
        $or: [
            { assignedTo: user.employee._id },
            { createdBy: user.employee._id },
        ],
    };
};

const getProjectScope = async (user) => {
    if (isAdmin(user)) return {};
    if (user.roleCode === "MANAGER") {
        const teamIds = await getTeamEmployeeIds(user.employee._id);
        return {
            $or: [
                { createdBy: user.employee._id },
                { developers: user.employee._id },
                { developers: { $in: teamIds } },
            ],
        };
    }
    return { developers: user.employee._id };
};

const parseDate = (value, fieldName) => {
    if (value === undefined || value === null || value === "") return null;
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw Object.assign(new Error(`${fieldName} must be a valid date.`), { statusCode: 400 });
        }
        return value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;

        // Matches YYYY-MM-DD (including ISO format like YYYY-MM-DDT00:00:00.000Z)
        const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
        if (match) {
            const dateStr = `${match[1]}-${match[2]}-${match[3]}`;
            const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
            if (Number.isNaN(dateObj.getTime())) {
                throw Object.assign(new Error(`${fieldName} must be a valid date.`), { statusCode: 400 });
            }
            return dateObj;
        }

        const dateObj = new Date(trimmed);
        if (Number.isNaN(dateObj.getTime())) {
            throw Object.assign(new Error(`${fieldName} must be a valid date.`), { statusCode: 400 });
        }
        return dateObj;
    }
    throw Object.assign(new Error(`${fieldName} must be a valid date.`), { statusCode: 400 });
};

const respondWithError = (res, error) =>
    res.status(
        error.statusCode ||
        (["ValidationError", "CastError"].includes(error.name) ? 400 : 500),
    ).json({
        success: false,
        message: error.message,
    });

module.exports.getTasks = async (req, res) => {
    try {
        const tasks = await Task.find(await getTaskScope(req.user))
            .populate("projectId", "projectName clientName deadline")
            .populate("assignedTo", "employeeId firstName middleName lastName")
            .populate("createdBy", "employeeId firstName middleName lastName")
            .populate("statusUpdatedBy", "employeeId firstName middleName lastName")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: tasks });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.getAssignableEmployees = async (req, res) => {
    try {
        if (!canCreateTasks(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Managers can assign tasks.",
            });
        }

        const filter = {
            isActive: true,
            employeeStatus: "ACTIVE",
        };
        if (!isAdmin(req.user)) {
            filter.reportingManager = req.user.employee._id;
        }

        const employees = await EmployeeMaster.find(filter)
            .select("_id employeeId firstName middleName lastName")
            .sort({ firstName: 1, lastName: 1 })
            .lean();

        res.status(200).json({ success: true, data: employees });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.getProjects = async (req, res) => {
    try {
        if (!canCreateTasks(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Managers can access projects.",
            });
        }
        const projects = await Project.find(await getProjectScope(req.user))
            .populate("developers", "employeeId firstName middleName lastName")
            .populate("createdBy", "employeeId firstName middleName lastName")
            .sort({ createdAt: -1 });
        const projectIds = projects.map((project) => project._id);
        const taskCounts = await Task.aggregate([
            { $match: { projectId: { $in: projectIds } } },
            { $group: { _id: { projectId: "$projectId", status: "$status" }, count: { $sum: 1 } } },
        ]);
        const countsByProject = new Map();
        taskCounts.forEach(({ _id, count }) => {
            const id = String(_id.projectId);
            const counts = countsByProject.get(id) || { total: 0 };
            counts.total += count;
            counts[_id.status] = count;
            countsByProject.set(id, counts);
        });

        res.status(200).json({
            success: true,
            data: projects.map((project) => ({
                ...project.toObject(),
                taskCounts: countsByProject.get(String(project._id)) || { total: 0 },
            })),
        });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.addEditProject = async (req, res) => {
    try {
        if (!canCreateTasks(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Managers can manage projects.",
            });
        }
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const {
            _id,
            projectName,
            clientName,
            startDate,
            deadline,
            budget,
            estimatedHours,
            developers,
            status = "Planning",
            requiredTask = "",
            description = "",
        } = body;
        const name = typeof projectName === "string" ? projectName.trim() : "";
        const client = typeof clientName === "string" ? clientName.trim() : "";
        if (!name || name.length > 160 || !client || client.length > 160) {
            return res.status(400).json({
                success: false,
                message: "Project name and client name are required and must be 160 characters or fewer.",
            });
        }
        if (!Array.isArray(developers) || developers.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Select at least one active developer for the project.",
            });
        }
        if (developers.some((developerId) => !mongoose.Types.ObjectId.isValid(developerId))) {
            return res.status(400).json({
                success: false,
                message: "One or more selected developers are invalid.",
            });
        }
        const uniqueDevelopers = [...new Set(developers.map(String))];
        if (!["Planning", "Active", "On Hold", "Completed", "Cancelled"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Choose a valid project status.",
            });
        }
        if (typeof description !== "string" || description.length > 4000) {
            return res.status(400).json({
                success: false,
                message: "Project description must be 4,000 characters or fewer.",
            });
        }
        if (typeof requiredTask !== "string" || requiredTask.length > 4000) {
            return res.status(400).json({
                success: false,
                message: "Required tasks must be 4,000 characters or fewer.",
            });
        }
        let parsedBudget = null;
        if (budget !== "" && budget !== undefined && budget !== null) {
            parsedBudget = Number(budget);
            if (!Number.isFinite(parsedBudget) || parsedBudget < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Project budget must be a valid non-negative amount.",
                });
            }
        }
        let parsedEstimatedHours = null;
        if (estimatedHours !== "" && estimatedHours !== undefined && estimatedHours !== null) {
            parsedEstimatedHours = Number(estimatedHours);
            if (!Number.isFinite(parsedEstimatedHours) || parsedEstimatedHours < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Estimated project time must be a valid non-negative number of hours.",
                });
            }
        }

        const parsedStartDate = parseDate(startDate, "Start date");
        const parsedDeadline = parseDate(deadline, "Deadline");
        if (parsedStartDate && parsedDeadline && parsedDeadline < parsedStartDate) {
            return res.status(400).json({
                success: false,
                message: "Project deadline cannot be before the start date.",
            });
        }

        const employeeScope = {
            _id: { $in: uniqueDevelopers },
            isActive: true,
            employeeStatus: "ACTIVE",
        };
        if (!isAdmin(req.user)) {
            employeeScope.reportingManager = req.user.employee._id;
        }
        const eligibleDevelopers = await EmployeeMaster.countDocuments(employeeScope);
        if (eligibleDevelopers !== uniqueDevelopers.length) {
            return res.status(400).json({
                success: false,
                message: "All developers must be active employees within your assignment scope.",
            });
        }

        const projectData = {
            projectName: name,
            clientName: client,
            startDate: parsedStartDate,
            deadline: parsedDeadline,
            budget: parsedBudget,
            estimatedHours: parsedEstimatedHours,
            developers: uniqueDevelopers,
            status,
            requiredTask: requiredTask.trim(),
            description: description.trim(),
        };
        let project;
        if (_id) {
            if (!mongoose.Types.ObjectId.isValid(_id)) {
                return res.status(400).json({
                    success: false,
                    message: "A valid project ID is required.",
                });
            }
            const existingProject = await Project.findOne({
                _id,
                ...(await getProjectScope(req.user)),
            });
            if (!existingProject) {
                return res.status(404).json({
                    success: false,
                    message: (await Project.exists({ _id }))
                        ? "Project is outside your access scope."
                        : "Project not found.",
                });
            }
            const orphanedTask = await Task.exists({
                projectId: _id,
                assignedTo: { $nin: uniqueDevelopers },
            });
            if (orphanedTask) {
                return res.status(409).json({
                    success: false,
                    message: "A developer assigned to an existing task cannot be removed from this project.",
                });
            }
            project = await Project.findOneAndUpdate(
                { _id, ...(await getProjectScope(req.user)) },
                { $set: projectData },
                { new: true, runValidators: true },
            );
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: "Project not found.",
                });
            }
        } else {
            project = await Project.create({
                ...projectData,
                createdBy: req.user.employee._id,
            });
        }
        project = await Project.findById(project._id)
            .populate("developers", "employeeId firstName middleName lastName")
            .populate("createdBy", "employeeId firstName middleName lastName");

        res.status(_id ? 200 : 201).json({
            success: true,
            message: _id ? "Project updated successfully." : "Project created successfully.",
            data: project,
        });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.deleteProject = async (req, res) => {
    try {
        if (!canCreateTasks(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Managers can manage projects.",
            });
        }
        const { _id } = req.body || {};
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid project ID is required.",
            });
        }
        const scope = await getProjectScope(req.user);
        const project = await Project.findOne({ _id, ...scope });
        if (!project) {
            const exists = await Project.exists({ _id });
            return res.status(404).json({
                success: false,
                message: exists ? "Project is outside your access scope." : "Project not found.",
            });
        }
        const linkedTasks = await Task.exists({ projectId: _id });
        if (linkedTasks) {
            return res.status(409).json({
                success: false,
                message: "This project has linked tasks and cannot be deleted. Mark it Completed or Cancelled instead.",
            });
        }
        await project.deleteOne();
        res.status(200).json({
            success: true,
            message: "Project deleted successfully.",
        });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.createTask = async (req, res) => {
    try {
        if (!canCreateTasks(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Managers can create tasks.",
            });
        }

        const body = req.body && typeof req.body === "object" ? req.body : {};
        const title = typeof body.title === "string" ? body.title.trim() : "";
        const description = body.description ?? "";
        const {
            assignedTo: requestedAssignees,
            projectId,
            dueDate,
            dueTime = "",
            estimatedHours,
            priority = "Medium",
        } = body;
        const assignees = [
            ...new Set(
                (Array.isArray(requestedAssignees)
                    ? requestedAssignees
                    : [requestedAssignees]
                )
                    .map((assignee) => String(assignee?._id || assignee || "").trim())
                    .filter(Boolean),
            ),
        ];

        if (!title || title.length > 160) {
            return res.status(400).json({
                success: false,
                message: "Task title is required and must be 160 characters or fewer.",
            });
        }
        if (typeof description !== "string" || description.length > 4000) {
            return res.status(400).json({
                success: false,
                message: "Task description must be 4,000 characters or fewer.",
            });
        }
        if (
            assignees.length === 0 ||
            assignees.some((assignee) => !mongoose.Types.ObjectId.isValid(assignee))
        ) {
            return res.status(400).json({
                success: false,
                message: "Select at least one valid employee for this task.",
            });
        }
        if (!["Low", "Medium", "High"].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: "Priority must be Low, Medium, or High.",
            });
        }
        let parsedEstimatedHours = null;
        if (estimatedHours !== "" && estimatedHours !== undefined && estimatedHours !== null) {
            parsedEstimatedHours = Number(estimatedHours);
            if (!Number.isFinite(parsedEstimatedHours) || parsedEstimatedHours < 0) {
                return res.status(400).json({
                    success: false,
                    message: "Estimated task time must be a valid non-negative number of hours.",
                });
            }
        }

        let parsedDueDate = null;
        if (dueDate) {
            const dateStr = typeof dueDate === "string" ? dueDate.slice(0, 10) : "";
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid due date (YYYY-MM-DD).",
                });
            }
            parsedDueDate = new Date(`${dateStr}T23:59:59.000Z`);
        }

        const assigneeFilter = {
            _id: { $in: assignees },
            isActive: true,
            employeeStatus: "ACTIVE",
        };
        if (!isAdmin(req.user)) {
            assigneeFilter.$or = [
                { reportingManager: req.user.employee._id },
                { _id: req.user.employee._id },
            ];
        }
        const eligibleAssigneeCount = await EmployeeMaster.countDocuments(assigneeFilter);
        if (eligibleAssigneeCount !== assignees.length) {
            return res.status(400).json({
                success: false,
                message: "One or more selected employees are inactive or outside your team.",
            });
        }

        let project = null;
        if (projectId && projectId !== "") {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid project ID.",
                });
            }
            project = await Project.findOne({
                _id: projectId,
                status: "Active",
                ...(isAdmin(req.user) ? {} : await getProjectScope(req.user)),
            });
            if (!project) {
                const projectExists = await Project.exists({ _id: projectId });
                return res.status(400).json({
                    success: false,
                    message: projectExists
                        ? "Tasks can only be created and assigned to Active projects."
                        : "Select an active project within your access scope.",
                });
            }

            // Automatically add any assignees to project developers if not already included
            const missingDevs = assignees.filter(
                (a) => !project.developers.some((d) => String(d) === String(a)),
            );
            if (missingDevs.length > 0) {
                await Project.updateOne(
                    { _id: project._id },
                    { $addToSet: { developers: { $each: missingDevs } } },
                );
            }

            if (
                parsedDueDate &&
                ((project.startDate && parsedDueDate < project.startDate) ||
                    (project.deadline && parsedDueDate > project.deadline))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Task due date must fall within the project's date range.",
                });
            }
        }

        const tasks = await Task.insertMany(
            assignees.map((assignedTo) => ({
                title,
                description: description.trim(),
                projectId: project ? project._id : null,
                assignedTo,
                createdBy: req.user.employee._id,
                dueDate: parsedDueDate,
                dueTime: typeof dueTime === "string" ? dueTime.trim() : "",
                estimatedHours: parsedEstimatedHours,
                priority,
                status: "Assigned",
                startedAt: null,
                runningStartedAt: null,
                totalWorkedMs: 0,
                completedAt: null,
            })),
        );
        const populatedTasks = await Task.find({
            _id: { $in: tasks.map((task) => task._id) },
        })
            .populate("projectId", "projectName clientName deadline")
            .populate("assignedTo", "employeeId firstName middleName lastName")
            .populate("createdBy", "employeeId firstName middleName lastName");

        res.status(201).json({
            success: true,
            message:
                assignees.length === 1
                    ? "Task created and assigned successfully."
                    : `Tasks created and assigned to ${assignees.length} employees successfully.`,
            data:
                populatedTasks.length === 1
                    ? populatedTasks[0]
                    : populatedTasks,
        });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.deleteTask = async (req, res) => {
    try {
        if (!canCreateTasks(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Only Admins and Managers can delete tasks.",
            });
        }
        const { _id } = req.body || {};
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid task ID is required.",
            });
        }
        const scope = await getTaskScope(req.user);
        const task = await Task.findOne({ _id, ...scope });
        if (!task) {
            const exists = await Task.exists({ _id });
            return res.status(404).json({
                success: false,
                message: exists ? "Task is outside your access scope." : "Task not found.",
            });
        }

        // Running tasks cannot be deleted
        if (task.status === "Running") {
            return res.status(400).json({
                success: false,
                message: "Running tasks cannot be deleted while work is in progress. Complete, stop, or change task status before deleting.",
            });
        }

        await task.deleteOne();
        res.status(200).json({
            success: true,
            message: "Task deleted successfully.",
            data: task,
        });
    } catch (error) {
        respondWithError(res, error);
    }
};

module.exports.updateTaskStatus = async (req, res) => {
    try {
        const body = req.body && typeof req.body === "object" ? req.body : {};
        const { _id, status, currentStatus } = body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({
                success: false,
                message: "A valid task ID is required.",
            });
        }
        if (!TASK_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Choose Assigned, Running, Code Review, or Completed.",
            });
        }
        if (!TASK_STATUSES.includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: "A valid current task status is required.",
            });
        }

        // Admins can only view tasks; only assigned employees can change task status
        if (isAdmin(req.user)) {
            return res.status(403).json({
                success: false,
                message: "Admins can only view tasks. Only the assigned employee can change task status.",
            });
        }

        const scope = await getTaskScope(req.user);
        const filter = { _id, ...scope };
        filter.status = currentStatus;

        const existingTask = await Task.findOne(filter);
        if (!existingTask) {
            const exists = await Task.exists({ _id });
            return res.status(exists ? 409 : 404).json({
                success: false,
                message: exists
                    ? "Task is no longer in the expected status or is outside your access scope."
                    : "Task not found.",
            });
        }

        const now = new Date();
        const updateFields = {
            status,
            statusUpdatedBy: req.user.employee._id,
        };

        let totalWorkedMs = Number(existingTask.totalWorkedMs) || 0;

        // If currently in Running status, accumulate elapsed time into totalWorkedMs and log to Day Report
        if (existingTask.status === "Running") {
            const runStart = existingTask.runningStartedAt || existingTask.startedAt;
            if (runStart) {
                const sessionMs = Math.max(0, now.getTime() - new Date(runStart).getTime());
                totalWorkedMs += sessionMs;
                updateFields.totalWorkedMs = totalWorkedMs;

                // Automatically log work session into Employee Day Report for today
                try {
                    const sessionMinutes = Math.max(1, Math.round(sessionMs / 60000));
                    const assignedEmployeeId = existingTask.assignedTo || req.user.employee._id;
                    const dateStr = now.toISOString().split("T")[0];

                    const formatTime12 = (d) => {
                        const dt = new Date(d);
                        return dt.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                        });
                    };

                    let dayReport = await DayReport.findOne({
                        employeeId: assignedEmployeeId,
                        date: dateStr,
                    });

                    if (!dayReport) {
                        dayReport = new DayReport({
                            employeeId: assignedEmployeeId,
                            date: dateStr,
                            activities: [],
                            totalWorkMinutes: 0,
                            totalBreakMinutes: 0,
                        });
                    }

                    let projectName = "General Task";
                    if (existingTask.projectId) {
                        const proj = await Project.findById(existingTask.projectId).select("projectName").lean();
                        if (proj?.projectName) projectName = proj.projectName;
                    }

                    dayReport.activities.push({
                        type: "Task",
                        title: existingTask.title || "Task Execution",
                        category: projectName,
                        startTime: formatTime12(runStart),
                        endTime: formatTime12(now),
                        durationMinutes: sessionMinutes,
                        remarks: (req.body.remarks || "").trim(),
                        status: "Completed",
                    });

                    let totalWork = 0;
                    let totalBreak = 0;
                    for (const act of dayReport.activities) {
                        const m = Number(act.durationMinutes) || 0;
                        if (act.type === "Break") totalBreak += m;
                        else totalWork += m;
                    }
                    dayReport.totalWorkMinutes = totalWork;
                    dayReport.totalBreakMinutes = totalBreak;

                    await dayReport.save();
                } catch (dayReportErr) {
                    console.error("Failed to auto-log task session to DayReport:", dayReportErr);
                }
            }
        }

        if (status === "Running") {
            // Prevent running tasks if today's Day Report is already locked
            const todayStr = now.toISOString().split("T")[0];
            const assignedEmpId = existingTask.assignedTo || req.user.employee._id;
            const lockedDayReport = await DayReport.findOne({
                employeeId: assignedEmpId,
                date: todayStr,
                status: "Locked",
            });
            if (lockedDayReport) {
                return res.status(400).json({
                    success: false,
                    message: "Today's Day Report is locked. You cannot perform or run tasks.",
                });
            }

            // Task enters Running state: real-time timer is ON!
            if (!existingTask.startedAt) {
                updateFields.startedAt = now;
            }
            updateFields.runningStartedAt = now;

            if (existingTask.status === "Completed") {
                updateFields.completedAt = null;
            }

            // If task has estimatedHours, set the target deadline from now based on remaining hours
            if (existingTask.estimatedHours && existingTask.estimatedHours > 0) {
                const totalDurationMs = existingTask.estimatedHours * 3600 * 1000;
                const remainingDurationMs = Math.max(0, totalDurationMs - totalWorkedMs);
                updateFields.dueDate = new Date(now.getTime() + remainingDurationMs);
            }
        } else if (status === "Completed") {
            updateFields.completedAt = now;
            updateFields.runningStartedAt = null;
        } else {
            // "Assigned" or "Code Review"
            updateFields.runningStartedAt = null;
            if (existingTask.status === "Completed") {
                updateFields.completedAt = null;
            }
        }

        const task = await Task.findByIdAndUpdate(
            existingTask._id,
            { $set: updateFields },
            { new: true, runValidators: true },
        )
            .populate("projectId", "projectName clientName deadline")
            .populate("assignedTo", "employeeId firstName middleName lastName")
            .populate("createdBy", "employeeId firstName middleName lastName")
            .populate("statusUpdatedBy", "employeeId firstName middleName lastName");

        res.status(200).json({
            success: true,
            message: "Task status updated successfully.",
            data: task,
        });
    } catch (error) {
        respondWithError(res, error);
    }
};
