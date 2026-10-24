const mongoose = require("mongoose");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const ExitManagement = require("../../modals/Employee/ExitManagementModel");
const CompanyMaster = require("../../modals/Organization/CompanyMasterModel");
const BranchMaster = require("../../modals/Organization/BranchMasterModel");
const DepartmentMaster = require("../../modals/Organization/DepartmentMasterModel");
const DesignationMaster = require("../../modals/Organization/DesignationMaster");
const JobOpening = require("../../modals/Recruitment/jobOpeningModel");
const Interview = require("../../modals/Recruitment/InterviewModel");
const LeaveRequest = require("../../modals/Leave/LeaveRequestModel");
const AttendanceRequest = require("../../modals/Attendance/AttendanceRequestModel");
const AttendanceLog = require("../../modals/Attendance/AttendanceLogModel");
const PayrollProcess = require("../../modals/Payroll/PayrollProcessModel");
const HolidayMaster = require("../../modals/Master/HolidayMasterModel");

// =========================================================
// DATE HELPERS (server local time)
// =========================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfMonth = (y, m) => new Date(y, m, 1);
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

// Payroll months are saved as 1-12 (or sometimes a month name).
const parseMonth = (value) => {
    const n = Number(value);
    if (Number.isInteger(n) && n >= 1 && n <= 12) return n - 1;
    const idx = MONTH_NAMES.findIndex((name) =>
        String(value || "").toLowerCase().startsWith(name.toLowerCase())
    );
    return idx;
};

const fullName = (e) =>
    [e?.firstName, e?.middleName, e?.lastName].filter(Boolean).join(" ").trim() || "Employee";

// "+12%" / "-3%" / "0%", with a trend type for the badge colour.
const percentTrend = (current, previous) => {
    if (!previous) {
        return current > 0 ? { label: "New", type: "up" } : { label: "0%", type: "neutral" };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 0) return { label: `+${pct}%`, type: "up" };
    if (pct < 0) return { label: `${pct}%`, type: "down" };
    return { label: "0%", type: "neutral" };
};

const PRESENT_STATUSES = ["Present", "Late", "Half Day"];

// =========================================================
// ACTIVITY FEED (shared by the dashboard card and "View All")
// Newest first across employees, payroll, leave and exits.
// =========================================================

const MAX_ACTIVITY_LIMIT = 200;

const buildActivities = async ({ limit = 5, departmentNames } = {}) => {
    const take = Math.min(Math.max(Number(limit) || 5, 1), MAX_ACTIVITY_LIMIT);

    const [employees, payrolls, leaves, exits, departments] = await Promise.all([
        EmployeeMaster.find({})
            .select("firstName middleName lastName departmentId createdAt")
            .sort({ createdAt: -1 })
            .limit(take)
            .lean(),
        PayrollProcess.find({ paymentStatus: { $in: ["Processed", "Paid"] } })
            .select("payrollMonth payrollYear paymentStatus employeeId updatedAt")
            .populate("employeeId", "firstName middleName lastName")
            .sort({ updatedAt: -1 })
            .limit(take)
            .lean(),
        LeaveRequest.find({})
            .select("employeeId status createdAt updatedAt")
            .populate("employeeId", "firstName middleName lastName")
            .sort({ updatedAt: -1 })
            .limit(take)
            .lean(),
        ExitManagement.find({})
            .select("employeeId employeeName overallStatus createdAt updatedAt")
            .populate("employeeId", "firstName middleName lastName")
            .sort({ updatedAt: -1 })
            .limit(take)
            .lean(),
        departmentNames ? null : DepartmentMaster.find({}).select("departmentname").lean(),
    ]);

    const deptNames =
        departmentNames || new Map((departments || []).map((d) => [String(d._id), d.departmentname]));

    const activities = [];

    employees.forEach((e) => {
        const dept = deptNames.get(String(e.departmentId));
        activities.push({
            id: `emp-${e._id}`,
            type: "join",
            title: "New Employee Added",
            description: `${fullName(e)} joined${dept ? ` ${dept}` : ""}`,
            time: e.createdAt,
        });
    });

    payrolls.forEach((p) => {
        const monthIdx = parseMonth(p.payrollMonth);
        const period = `${monthIdx >= 0 ? MONTH_NAMES[monthIdx] : p.payrollMonth} ${p.payrollYear}`;
        const who = p.employeeId ? ` for ${fullName(p.employeeId)}` : "";
        activities.push({
            id: `pay-${p._id}`,
            type: "payroll",
            title: p.paymentStatus === "Paid" ? "Payroll Disbursed" : "Payroll Processed",
            description: `${period} payroll${who} ${p.paymentStatus.toLowerCase()}`,
            time: p.updatedAt,
        });
    });

    leaves.forEach((l) => {
        const who = l.employeeId ? fullName(l.employeeId) : "An employee";
        const title =
            l.status === "Approved"
                ? "Leave Approved"
                : l.status === "Rejected"
                    ? "Leave Rejected"
                    : l.status === "Cancelled"
                        ? "Leave Cancelled"
                        : "Leave Requested";
        activities.push({
            id: `leave-${l._id}`,
            type: "leave",
            title,
            description: `${who}'s leave request ${l.status === "Pending" ? "is pending" : l.status.toLowerCase()}`,
            time: l.updatedAt || l.createdAt,
        });
    });

    exits.forEach((x) => {
        const who = x.employeeId ? fullName(x.employeeId) : x.employeeName || "An employee";
        activities.push({
            id: `exit-${x._id}`,
            type: "exit",
            title: x.overallStatus === "Completed" ? "Exit Completed" : "Exit Initiated",
            description: `${who} — ${x.overallStatus}`,
            time: x.updatedAt || x.createdAt,
        });
    });

    return activities
        .filter((a) => a.time)
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, take);
};

module.exports.getRecentActivities = async (req, res) => {
    try {
        const limit = req.body?.limit ?? req.query?.limit ?? 100;
        const data = await buildActivities({ limit });
        res.status(200).json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =========================================================
// DASHBOARD
// =========================================================

module.exports.getDashboardStats = async (req, res) => {
    try {
        const now = new Date();
        const today = startOfDay(now);
        const tomorrow = addDays(today, 1);
        const last7Start = addDays(today, -6);
        const last30Start = addDays(today, -29);
        const thirtyDaysAgo = addDays(today, -30);
        const yearStart = startOfMonth(now.getFullYear(), 0);
        const nextYearStart = startOfMonth(now.getFullYear() + 1, 0);
        const upcomingEnd = addDays(today, 30);

        const [
            employees,
            companyCount,
            branchCount,
            departmentCount,
            designationCount,
            jobOpenings,
            pendingLeaves,
            pendingAttendance,
            attendanceLogs,
            leavesInWindow,
            payrolls,
            completedExits,
            upcomingInterviews,
            holidays,
            departments,
            designations,
        ] = await Promise.all([
            EmployeeMaster.find({})
                .select(
                    "employeeId firstName middleName lastName profileImage officialEmail personalEmail departmentId designationId employeeStatus isActive joiningDate dateOfBirth createdAt currentStatus"
                )
                .sort({ createdAt: -1 })
                .lean(),
            CompanyMaster.countDocuments(),
            BranchMaster.countDocuments(),
            DepartmentMaster.countDocuments(),
            DesignationMaster.countDocuments(),
            JobOpening.find({}).select("jobTitle jobStatus numberOfPositions filledPositions isActive createdAt").lean(),
            LeaveRequest.countDocuments({ status: "Pending" }),
            AttendanceRequest.countDocuments({ status: "Pending" }),
            AttendanceLog.find({ date: { $gte: last30Start, $lt: tomorrow } })
                .select("employeeId date status")
                .lean(),
            // Approved leave overlapping the last 30 days (for "on leave" per day).
            LeaveRequest.find({
                status: "Approved",
                startDate: { $lt: tomorrow },
                endDate: { $gte: last30Start },
            })
                .select("employeeId startDate endDate")
                .lean(),
            PayrollProcess.find({}).select("payrollMonth payrollYear netPay paymentStatus updatedAt").lean(),
            ExitManagement.find({
                overallStatus: "Completed",
                lastWorkingDate: { $gte: yearStart, $lt: nextYearStart },
            })
                .select("lastWorkingDate")
                .lean(),
            Interview.find({ status: { $in: ["Scheduled", "Rescheduled"] }, scheduledDate: { $gte: today, $lt: upcomingEnd } })
                .select("roundName scheduledDate meetingLinkOrLocation candidate jobOpening")
                .populate("candidate", "firstName middleName lastName candidateName")
                .populate("jobOpening", "jobTitle")
                .sort({ scheduledDate: 1 })
                .limit(10)
                .lean(),
            HolidayMaster.find({}).select("holidayName holidayDate recurringEveryYear isActive").lean(),
            DepartmentMaster.find({}).select("departmentname").lean(),
            DesignationMaster.find({}).select("designationname").lean(),
        ]);

        const departmentNames = new Map(departments.map((d) => [String(d._id), d.departmentname]));
        const designationNames = new Map(designations.map((d) => [String(d._id), d.designationname]));

        // ---------------------------------------------------------
        // Headcount
        // ---------------------------------------------------------
        const isActiveEmployee = (e) => e.isActive !== false && (e.employeeStatus || "ACTIVE") !== "INACTIVE";
        const activeList = employees.filter(isActiveEmployee);
        const totalEmployees = employees.length;
        const activeEmployees = activeList.length;
        const joinedOn = (e) => new Date(e.joiningDate || e.createdAt);

        const headcountAt = (date) => employees.filter((e) => joinedOn(e) <= date).length;
        const activeHeadcountAt = (date) => activeList.filter((e) => joinedOn(e) <= date).length;

        const newHires = employees.filter((e) => joinedOn(e) >= thirtyDaysAgo && joinedOn(e) < tomorrow).length;

        // Last 7 calendar months, oldest first.
        const last7Months = Array.from({ length: 7 }, (_, i) => {
            const start = startOfMonth(now.getFullYear(), now.getMonth() - 6 + i);
            const end = startOfMonth(start.getFullYear(), start.getMonth() + 1);
            return { start, end, year: start.getFullYear(), month: start.getMonth() };
        });

        // ---------------------------------------------------------
        // Attendance (per day, last 30 days)
        // ---------------------------------------------------------
        const presentByDay = new Map();
        attendanceLogs.forEach((log) => {
            if (!PRESENT_STATUSES.includes(log.status)) return;
            const key = dayKey(new Date(log.date));
            if (!presentByDay.has(key)) presentByDay.set(key, new Set());
            presentByDay.get(key).add(String(log.employeeId));
        });

        const onLeaveOn = (day) => {
            const ids = new Set();
            leavesInWindow.forEach((l) => {
                if (startOfDay(new Date(l.startDate)) <= day && startOfDay(new Date(l.endDate)) >= day) {
                    ids.add(String(l.employeeId));
                }
            });
            return ids;
        };

        const dayStats = (day) => {
            const present = presentByDay.get(dayKey(day))?.size || 0;
            const onLeave = onLeaveOn(day).size;
            const workforce = activeHeadcountAt(addDays(day, 1));
            const absent = Math.max(workforce - present - onLeave, 0);
            const rate = workforce ? Math.min(Math.round((present / workforce) * 100), 100) : 0;
            return { day, present, absent, onLeave, rate };
        };

        const last30Days = Array.from({ length: 30 }, (_, i) => dayStats(addDays(last30Start, i)));
        const last7Days = last30Days.slice(-7);
        const todayStats = last30Days[last30Days.length - 1];
        const yesterdayStats = last30Days[last30Days.length - 2];

        const onLeaveTodayIds = onLeaveOn(today);

        const attendanceTrend = {
            last7: last7Days.map((d) => ({
                label: d.day.toLocaleDateString("en-US", { weekday: "short" }),
                rate: d.rate,
            })),
            // 30 days in 5 buckets of 6 days, labelled by the bucket's first day.
            last30: Array.from({ length: 5 }, (_, b) => {
                const bucket = last30Days.slice(b * 6, b * 6 + 6);
                const rate = bucket.length
                    ? Math.round(bucket.reduce((sum, d) => sum + d.rate, 0) / bucket.length)
                    : 0;
                return {
                    label: `${bucket[0].day.getDate()} ${MONTH_NAMES[bucket[0].day.getMonth()]}`,
                    rate,
                };
            }),
        };

        // ---------------------------------------------------------
        // Payroll (Paid net pay per month)
        // ---------------------------------------------------------
        const paidFor = (year, month) =>
            payrolls
                .filter(
                    (p) =>
                        p.paymentStatus === "Paid" &&
                        Number(p.payrollYear) === year &&
                        parseMonth(p.payrollMonth) === month
                )
                .reduce((sum, p) => sum + (Number(p.netPay) || 0), 0);

        const payrollThisMonth = paidFor(now.getFullYear(), now.getMonth());
        const prevMonth = startOfMonth(now.getFullYear(), now.getMonth() - 1);
        const payrollLastMonth = paidFor(prevMonth.getFullYear(), prevMonth.getMonth());

        // ---------------------------------------------------------
        // Recruitment
        // ---------------------------------------------------------
        const openJobs = jobOpenings.filter((j) => j.jobStatus === "ACTIVE" && j.isActive !== false);
        const openPositions = openJobs.reduce(
            (sum, j) => sum + Math.max((Number(j.numberOfPositions) || 0) - (Number(j.filledPositions) || 0), 0),
            0
        );

        // ---------------------------------------------------------
        // Trend badges + sparkline series
        // ---------------------------------------------------------
        const trends = {
            totalEmployees: percentTrend(totalEmployees, headcountAt(thirtyDaysAgo)),
            presentToday: {
                label: `${todayStats.rate}%`,
                type: todayStats.rate >= 75 ? "success" : todayStats.rate > 0 ? "neutral" : "down",
            },
            absentToday: (() => {
                const t = percentTrend(todayStats.absent, yesterdayStats.absent);
                // Fewer absences is good: flip the colour.
                return { label: t.label, type: t.type === "up" ? "down" : t.type === "down" ? "success" : t.type };
            })(),
            activeEmployees: {
                label: totalEmployees ? `${Math.round((activeEmployees / totalEmployees) * 100)}%` : "0%",
                type: "success",
            },
            pendingLeaves: { label: pendingLeaves > 0 ? "Pending" : "Clear", type: "neutral" },
            payrollThisMonth: percentTrend(payrollThisMonth, payrollLastMonth),
            newHires: { label: "30 Days", type: newHires > 0 ? "up" : "neutral" },
            openPositions: { label: `${openJobs.length} Job${openJobs.length === 1 ? "" : "s"}`, type: "neutral" },
        };

        const sparklines = {
            totalEmployees: last7Months.map((m) => headcountAt(new Date(m.end.getTime() - 1))),
            presentToday: last7Days.map((d) => d.present),
            absentToday: last7Days.map((d) => d.absent),
            activeEmployees: last7Months.map((m) => activeHeadcountAt(new Date(m.end.getTime() - 1))),
            pendingLeaves: last7Days.map((d) => d.onLeave),
            payrollThisMonth: last7Months.map((m) => paidFor(m.year, m.month)),
            newHires: last7Months.map(
                (m) => employees.filter((e) => joinedOn(e) >= m.start && joinedOn(e) < m.end).length
            ),
            openPositions: last7Months.map(
                (m) => jobOpenings.filter((j) => new Date(j.createdAt) >= m.start && new Date(j.createdAt) < m.end).length
            ),
        };

        // ---------------------------------------------------------
        // Employee growth (this year, per month)
        // ---------------------------------------------------------
        const employeeGrowth = {
            year: now.getFullYear(),
            labels: MONTH_NAMES,
            hires: MONTH_NAMES.map(
                (_, m) =>
                    employees.filter((e) => {
                        const d = joinedOn(e);
                        return d.getFullYear() === now.getFullYear() && d.getMonth() === m;
                    }).length
            ),
            departures: MONTH_NAMES.map(
                (_, m) => completedExits.filter((x) => new Date(x.lastWorkingDate).getMonth() === m).length
            ),
        };

        // ---------------------------------------------------------
        // Department distribution
        // ---------------------------------------------------------
        const deptCounts = new Map();
        employees.forEach((e) => {
            const key = e.departmentId ? String(e.departmentId) : "unassigned";
            deptCounts.set(key, (deptCounts.get(key) || 0) + 1);
        });
        const deptItems = [...deptCounts.entries()]
            .map(([id, count]) => ({
                name: id === "unassigned" ? "Unassigned" : departmentNames.get(id) || "Unknown",
                count,
            }))
            .sort((a, b) => b.count - a.count);
        const top = deptItems.slice(0, 3);
        const othersCount = deptItems.slice(3).reduce((sum, d) => sum + d.count, 0);
        if (othersCount > 0) top.push({ name: "Others", count: othersCount });
        const departmentDistribution = {
            totalDepartments: departmentCount,
            items: top.map((d) => ({
                ...d,
                percent: totalEmployees ? Math.round((d.count / totalEmployees) * 100) : 0,
            })),
        };

        // ---------------------------------------------------------
        // Employee directory
        // ---------------------------------------------------------
        const statusLabel = (e) => {
            if (onLeaveTodayIds.has(String(e._id))) return "On Leave";
            if (e.currentStatus && e.currentStatus !== "Active") return e.currentStatus;
            switch (e.employeeStatus) {
                case "NOTICE":
                    return "Notice Period";
                case "INACTIVE":
                    return "Inactive";
                default:
                    return e.isActive === false ? "Inactive" : "Active";
            }
        };

        const employeeDirectory = employees.map((e) => ({
            id: String(e._id),
            employeeCode: e.employeeId || "",
            name: fullName(e),
            email: e.officialEmail || e.personalEmail || "",
            profileImage: e.profileImage || "",
            department: departmentNames.get(String(e.departmentId)) || "—",
            designation: designationNames.get(String(e.designationId)) || "—",
            status: statusLabel(e),
        }));

        const recentActivities = await buildActivities({ limit: 5, departmentNames });

        // ---------------------------------------------------------
        // Upcoming events (next 30 days)
        // ---------------------------------------------------------
        const events = [];

        upcomingInterviews.forEach((i) => {
            const c = i.candidate;
            const candidateName = c ? (c.firstName || c.lastName ? fullName(c) : c.candidateName) : "";
            const when = new Date(i.scheduledDate);
            events.push({
                id: `int-${i._id}`,
                title: `Interview: ${i.jobOpening?.jobTitle || i.roundName}`,
                subtitle: [
                    when.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
                    candidateName || i.roundName,
                ]
                    .filter(Boolean)
                    .join(" • "),
                date: when,
                variant: "danger",
            });
        });

        // Next occurrence of a month/day within the window.
        const nextOccurrence = (date) => {
            const d = new Date(date);
            let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
            if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
            return next;
        };

        holidays
            .filter((h) => h.isActive !== false && h.holidayDate)
            .forEach((h) => {
                const date = h.recurringEveryYear ? nextOccurrence(h.holidayDate) : startOfDay(new Date(h.holidayDate));
                if (date >= today && date < upcomingEnd) {
                    events.push({
                        id: `hol-${h._id}`,
                        title: h.holidayName,
                        subtitle: "Holiday",
                        date,
                        variant: "primary",
                    });
                }
            });

        activeList.forEach((e) => {
            if (e.joiningDate) {
                const date = nextOccurrence(e.joiningDate);
                const years = date.getFullYear() - new Date(e.joiningDate).getFullYear();
                if (years >= 1 && date < upcomingEnd) {
                    events.push({
                        id: `anniv-${e._id}`,
                        title: `${e.firstName || fullName(e)}'s Work Anniv.`,
                        subtitle: `${years} Year${years > 1 ? "s" : ""} Milestone!`,
                        date,
                        variant: "secondary",
                    });
                }
            }
            if (e.dateOfBirth) {
                const date = nextOccurrence(e.dateOfBirth);
                if (date < upcomingEnd) {
                    events.push({
                        id: `bday-${e._id}`,
                        title: `${e.firstName || fullName(e)}'s Birthday`,
                        subtitle: "Celebrate the day!",
                        date,
                        variant: "secondary",
                    });
                }
            }
        });

        const upcomingEvents = events
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 5)
            .map((ev) => {
                const d = new Date(ev.date);
                return {
                    ...ev,
                    badge: {
                        month: MONTH_NAMES[d.getMonth()].toUpperCase(),
                        day: String(d.getDate()).padStart(2, "0"),
                        variant: ev.variant,
                    },
                };
            });

        res.status(200).json({
            success: true,
            data: {
                // Headline cards
                totalEmployees,
                activeEmployees,
                presentToday: todayStats.present,
                absentToday: todayStats.absent,
                onLeaveToday: onLeaveTodayIds.size,
                pendingLeaves,
                pendingAttendance,
                payrollThisMonth,
                newHires,
                openPositions,
                trends,
                sparklines,

                // Panels
                attendanceTrend,
                employeeGrowth,
                departmentDistribution,
                employees: employeeDirectory,
                recentActivities,
                upcomingEvents,

                // Kept for backward compatibility
                employeeCount: totalEmployees,
                companyCount,
                branchCount,
                departmentCount,
                designationCount,
                jobOpeningCount: jobOpenings.length,
                recentEmployees: employeeDirectory.slice(0, 5),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.updateActivityStatus = async (req, res) => {
    try {
        const { employeeId, email, employeeCode, status } = req.body;
        const newStatus = status ? status.trim() : "Active";

        let query = null;
        if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
            query = { _id: employeeId };
        } else if (employeeCode) {
            query = { employeeId: employeeCode };
        } else if (email) {
            query = { $or: [{ officialEmail: email.toLowerCase() }, { personalEmail: email.toLowerCase() }] };
        }

        if (query) {
            await EmployeeMaster.findOneAndUpdate(query, { currentStatus: newStatus });
        }

        return res.status(200).json({ success: true, status: newStatus });
    } catch (error) {
        console.error("Error in updateActivityStatus:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
