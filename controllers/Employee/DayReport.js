const DayReport = require("../../modals/Employee/DayReportModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");

/**
 * Helper to compute work and break minutes from activities
 */
const recalculateTotals = (activities = []) => {
  let totalWorkMinutes = 0;
  let totalBreakMinutes = 0;

  for (const act of activities) {
    const mins = Number(act.durationMinutes) || 0;
    if (act.type === "Break") {
      totalBreakMinutes += mins;
    } else if (act.type === "Task" || act.type === "Meeting" || act.type === "Other") {
      totalWorkMinutes += mins;
    }
  }

  return { totalWorkMinutes, totalBreakMinutes };
};

/**
 * Get Day Report for a specific date and employee
 */
exports.getDayReport = async (req, res) => {
  try {
    const currentEmployeeId = req.user?.employee?._id;
    const requestedEmployeeId = req.body.employeeId || currentEmployeeId;

    // Check permissions: regular employees only view their own report
    const isSuperOrAdmin = req.user?.isSuperAdmin || ["ADMIN", "SUPER_ADMIN"].includes(req.user?.roleCode);
    const targetEmployeeId = isSuperOrAdmin ? requestedEmployeeId : currentEmployeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const date = req.body.date || todayStr;
    if (date > todayStr) {
      return res.status(400).json({
        success: false,
        message: "Cannot view Day Report for a future date. Only today or past dates are accessible.",
      });
    }

    let report = await DayReport.findOne({
      employeeId: targetEmployeeId,
      date,
    }).populate("employeeId", "firstName middleName lastName employeeId email");

    if (!report) {
      // Return empty report structure if none exists yet for this date
      const employee = await EmployeeMaster.findById(targetEmployeeId, "firstName middleName lastName employeeId email");
      return res.status(200).json({
        success: true,
        data: {
          employeeId: employee,
          date,
          activities: [],
          totalWorkMinutes: 0,
          totalBreakMinutes: 0,
          status: "Draft",
        },
        summary: {
          totalWorkMinutes: 0,
          totalBreakMinutes: 0,
          tasksCount: 0,
          breaksCount: 0,
          celebrationsCount: 0,
          activitiesCount: 0,
        },
      });
    }

    const activities = report.activities || [];
    const tasksCount = activities.filter((a) => a.type === "Task").length;
    const breaksCount = activities.filter((a) => a.type === "Break").length;
    const celebrationsCount = activities.filter((a) => a.type === "Celebration").length;

    return res.status(200).json({
      success: true,
      data: report,
      summary: {
        totalWorkMinutes: report.totalWorkMinutes || 0,
        totalBreakMinutes: report.totalBreakMinutes || 0,
        tasksCount,
        breaksCount,
        celebrationsCount,
        activitiesCount: activities.length,
      },
    });
  } catch (error) {
    console.error("Error in getDayReport:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to fetch day report" });
  }
};

/**
 * Add a new activity to the day report
 */
exports.addActivity = async (req, res) => {
  try {
    const employeeId = req.user?.employee?._id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const {
      date = new Date().toISOString().split("T")[0],
      type = "Task",
      title,
      category = "",
      startTime,
      endTime = "",
      durationMinutes = 0,
      remarks = "",
      status = "Completed",
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Activity title is required" });
    }

    if (!startTime) {
      return res.status(400).json({ success: false, message: "Start time is required" });
    }

    let report = await DayReport.findOne({ employeeId, date });

    if (report && report.status === "Locked") {
      return res.status(400).json({
        success: false,
        message: `Day report for ${date} is locked. No new activities can be added.`,
      });
    }

    if (!report) {
      report = new DayReport({
        employeeId,
        date,
        activities: [],
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
      });
    }

    const newActivity = {
      type,
      title: title.trim(),
      category: category.trim(),
      startTime,
      endTime,
      durationMinutes: Math.max(0, Number(durationMinutes) || 0),
      remarks: remarks.trim(),
      status,
    };

    report.activities.push(newActivity);

    const totals = recalculateTotals(report.activities);
    report.totalWorkMinutes = totals.totalWorkMinutes;
    report.totalBreakMinutes = totals.totalBreakMinutes;

    await report.save();

    return res.status(201).json({
      success: true,
      message: `${type} logged successfully`,
      data: report,
    });
  } catch (error) {
    console.error("Error in addActivity:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to log activity" });
  }
};

/**
 * Update an existing activity
 */
exports.updateActivity = async (req, res) => {
  try {
    const employeeId = req.user?.employee?._id;
    const { dayReportId, activityId, type, title, category, startTime, endTime, durationMinutes, remarks, status } = req.body;

    if (!dayReportId || !activityId) {
      return res.status(400).json({ success: false, message: "dayReportId and activityId are required" });
    }

    const report = await DayReport.findOne({ _id: dayReportId, employeeId });
    if (!report) {
      return res.status(404).json({ success: false, message: "Day report not found" });
    }

    if (report.status === "Locked") {
      return res.status(400).json({
        success: false,
        message: "Day report is locked. Activities cannot be modified.",
      });
    }

    const activity = report.activities.id(activityId);
    if (!activity) {
      return res.status(404).json({ success: false, message: "Activity not found" });
    }

    if (type) activity.type = type;
    if (title !== undefined) activity.title = title.trim();
    if (category !== undefined) activity.category = category.trim();
    if (startTime !== undefined) activity.startTime = startTime;
    if (endTime !== undefined) activity.endTime = endTime;
    if (durationMinutes !== undefined) activity.durationMinutes = Math.max(0, Number(durationMinutes) || 0);
    if (remarks !== undefined) activity.remarks = remarks.trim();
    if (status !== undefined) activity.status = status;

    const totals = recalculateTotals(report.activities);
    report.totalWorkMinutes = totals.totalWorkMinutes;
    report.totalBreakMinutes = totals.totalBreakMinutes;

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Activity updated successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error in updateActivity:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to update activity" });
  }
};

/**
 * Delete an activity from day report
 */
exports.deleteActivity = async (req, res) => {
  try {
    const employeeId = req.user?.employee?._id;
    const { dayReportId, activityId } = req.body;

    if (!dayReportId || !activityId) {
      return res.status(400).json({ success: false, message: "dayReportId and activityId are required" });
    }

    const report = await DayReport.findOne({ _id: dayReportId, employeeId });
    if (!report) {
      return res.status(404).json({ success: false, message: "Day report not found" });
    }

    if (report.status === "Locked") {
      return res.status(400).json({
        success: false,
        message: "Day report is locked. Activities cannot be deleted.",
      });
    }

    report.activities.pull({ _id: activityId });

    const totals = recalculateTotals(report.activities);
    report.totalWorkMinutes = totals.totalWorkMinutes;
    report.totalBreakMinutes = totals.totalBreakMinutes;

    await report.save();

    return res.status(200).json({
      success: true,
      message: "Activity removed successfully",
      data: report,
    });
  } catch (error) {
    console.error("Error in deleteActivity:", error);
    return res.status(500).json({ success: false, message: error.message || "Failed to delete activity" });
  }
};

/**
 * Toggle lock status of day report and persist all edited activities/remarks
 */
exports.toggleLock = async (req, res) => {
  try {
    const employeeId = req.user?.employee?._id;
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const { date, status = "Locked", activities } = req.body;
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (date > todayStr) {
      return res.status(400).json({
        success: false,
        message: "Cannot submit or lock Day Report for a future date. Only today or past dates are allowed.",
      });
    }

    let report = await DayReport.findOne({ employeeId, date });

    if (!report) {
      report = new DayReport({
        employeeId,
        date,
        activities: [],
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        status: status || "Locked",
      });
    }

    // If activities are provided (with edited remarks), persist them
    if (Array.isArray(activities)) {
      report.activities = activities.map((act) => ({
        type: act.type || "Task",
        title: (act.title || "").trim(),
        category: (act.category || "").trim(),
        startTime: act.startTime || "",
        endTime: act.endTime || "",
        durationMinutes: Math.max(0, Number(act.durationMinutes) || 0),
        remarks: (act.remarks || "").trim(),
        status: act.status || "Completed",
      }));

      const totals = recalculateTotals(report.activities);
      report.totalWorkMinutes = totals.totalWorkMinutes;
      report.totalBreakMinutes = totals.totalBreakMinutes;
    }

    // If attempting to unlock (status === "Draft"), verify supervisor permission
    const isSuperOrAdmin =
      req.user?.isSuperAdmin ||
      ["ADMIN", "SUPER_ADMIN", "HR"].includes(req.user?.roleCode);
    const isManagerOrTL = ["MANAGER", "TEAM_LEADER", "TL", "LEAD"].includes(
      req.user?.roleCode
    );

    if (status === "Draft" && !isSuperOrAdmin && !isManagerOrTL) {
      return res.status(403).json({
        success: false,
        message:
          "Employees cannot unlock a locked Day Report. Please contact your Team Leader, Manager, or HR to unlock your report.",
      });
    }

    if (report.unlockedBySupervisor && status === "Locked" && !isSuperOrAdmin && !isManagerOrTL) {
      return res.status(403).json({
        success: false,
        message:
          "This Day Report has already been reviewed/unlocked by management and is marked as Submitted.",
      });
    }

    report.status = status;
    if (status === "Draft") {
      report.unlockedBySupervisor = true;
      report.unlockedAt = new Date();
      report.unlockedBy = req.user?._id;
    } else if (status === "Locked") {
      report.unlockedBySupervisor = false;
    }
    await report.save();

    return res.status(200).json({
      success: true,
      message: `Day report for ${date} has been ${status.toLowerCase()} successfully`,
      data: report,
    });
  } catch (error) {
    console.error("Error in toggleLock:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update day report lock status",
    });
  }
};

/**
 * Get all employee day reports for date/status (Admin/HR/Manager/TL view)
 */
exports.getAllDayReports = async (req, res) => {
  try {
    const isSuperOrAdmin =
      req.user?.isSuperAdmin ||
      ["ADMIN", "SUPER_ADMIN", "HR"].includes(req.user?.roleCode);
    const isManagerOrTL = ["MANAGER", "TEAM_LEADER", "TL", "LEAD"].includes(
      req.user?.roleCode
    );

    if (!isSuperOrAdmin && !isManagerOrTL) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Only Admin, HR, Manager, or Team Leader can access employee day reports.",
      });
    }

    const { date, status, search } = {
      ...(req.query || {}),
      ...(req.body || {}),
    };
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Filter employees by reporting hierarchy for Managers/TLs
    let employeeFilter = { isActive: { $ne: false } };
    if (isManagerOrTL && !isSuperOrAdmin) {
      const teamEmployees = await EmployeeMaster.find({
        reportingManager: req.user?.employee?._id,
      })
        .select("_id")
        .lean();
      const ids = teamEmployees.map((e) => e._id);
      if (req.user?.employee?._id) {
        ids.push(req.user.employee._id);
      }
      employeeFilter._id = { $in: ids };
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), "i");
      employeeFilter.$or = [
        { firstName: reg },
        { lastName: reg },
        { employeeId: reg },
        { email: reg },
      ];
    }

    const employees = await EmployeeMaster.find(employeeFilter)
      .select(
        "firstName middleName lastName employeeId email profileImage designationId departmentId reportingManager"
      )
      .populate("designationId", "designationname designationName designationcode")
      .populate("departmentId", "departmentname departmentName departmentcode")
      .lean();

    const employeeIds = employees.map((e) => e._id);
    const employeesMap = new Map();
    for (const emp of employees) {
      employeesMap.set(String(emp._id), emp);
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Build DayReport query (strictly restricted to today or past dates)
    const reportQuery = {
      employeeId: { $in: employeeIds },
    };
    if (date && date !== "All" && date !== "all") {
      if (date > todayStr) {
        return res.status(400).json({
          success: false,
          message: "Cannot view Day Reports for future dates. Only today or past dates are accessible.",
        });
      }
      reportQuery.date = date;
    } else {
      reportQuery.date = { $lte: todayStr };
    }
    if (status && status !== "All") {
      reportQuery.status = status;
    }

    // Find actual day reports, sorted date-wise (newest first)
    const dayReports = await DayReport.find(reportQuery)
      .sort({ date: -1, updatedAt: -1 })
      .lean();

    const results = [];
    for (const rep of dayReports) {
      const emp = employeesMap.get(String(rep.employeeId));
      if (!emp) continue;

      const activities = rep.activities || [];
      const remarksList = activities.map((a) => a.remarks).filter(Boolean);
      const repStatus = rep.status || "Draft";

      results.push({
        _id: String(rep._id),
        dayReportId: String(rep._id),
        employeeId: emp._id,
        employeeCode: emp.employeeId || "",
        employeeName:
          `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee",
        email: emp.email || "",
        profileImage: emp.profileImage || "",
        designation:
          emp.designationId?.designationname ||
          emp.designationId?.designationName ||
          "—",
        department:
          emp.departmentId?.departmentname ||
          emp.departmentId?.departmentName ||
          "—",
        date: rep.date,
        status: repStatus,
        isLocked: repStatus === "Locked",
        unlockedBySupervisor: Boolean(rep.unlockedBySupervisor),
        totalWorkMinutes: rep.totalWorkMinutes || 0,
        totalBreakMinutes: rep.totalBreakMinutes || 0,
        activitiesCount: activities.length,
        activities,
        remarksSummary:
          remarksList.length > 0 ? remarksList.join(" • ") : "No remarks",
      });
    }

    return res.status(200).json({
      success: true,
      data: results,
      date: date || "All",
      totalCount: results.length,
    });
  } catch (error) {
    console.error("Error in getAllDayReports:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch day reports",
    });
  }
};

/**
 * Unlock a specific employee's Day Report (Admin, HR, TL, Manager only)
 */
exports.unlockDayReport = async (req, res) => {
  try {
    const isSuperOrAdmin =
      req.user?.isSuperAdmin ||
      ["ADMIN", "SUPER_ADMIN", "HR"].includes(req.user?.roleCode);
    const isManagerOrTL = ["MANAGER", "TEAM_LEADER", "TL", "LEAD"].includes(
      req.user?.roleCode
    );

    if (!isSuperOrAdmin && !isManagerOrTL) {
      return res.status(403).json({
        success: false,
        message:
          "Permission denied. Only Team Leaders, Managers, HR, or Administrators can unlock Day Reports.",
      });
    }

    const { dayReportId, employeeId, date } = req.body;

    const todayStr = new Date().toISOString().split("T")[0];
    if (date && date > todayStr) {
      return res.status(400).json({
        success: false,
        message: "Cannot unlock Day Report for a future date.",
      });
    }

    let report = null;
    if (dayReportId) {
      report = await DayReport.findById(dayReportId);
    } else if (employeeId && date) {
      report = await DayReport.findOne({ employeeId, date });
    }

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Day report not found to unlock",
      });
    }

    report.status = "Draft";
    report.unlockedBySupervisor = true;
    report.unlockedAt = new Date();
    report.unlockedBy = req.user?._id;
    await report.save();

    return res.status(200).json({
      success: true,
      message: `Day report for ${report.date} has been unlocked successfully`,
      data: report,
    });
  } catch (error) {
    console.error("Error in unlockDayReport:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to unlock day report",
    });
  }
};
