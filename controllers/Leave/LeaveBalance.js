const LeaveBalance = require("../../modals/Leave/LeaveBalanceModel");
const EmployeeMaster = require("../../modals/Employee/EmployeeMasterModel");
const LeaveType = require("../../modals/Leave/LeaveTypeModel");
const LeaveRequest = require("../../modals/Leave/LeaveRequestModel");
const {
    parsePaging,
    buildPagination,
    buildRowFilter,
} = require("../../utils/pagination");

const hasAdminRights = (user) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    const roleCode = String(user.roleCode || user.role?.roleCode || "").toUpperCase();
    return ["SUPER_ADMIN", "ADMIN", "HR"].includes(roleCode);
};

// One pass over (employee x leave type) pairs, done with 2 reads and at most
// 2 writes. It used to run 3+ sequential queries per pair - for 26 employees
// and 3 leave types that was 200+ round trips on every page load.
// Rules are unchanged: used = approved days, pending = pending days (requests
// starting in `year`), balance = allocated - used, missing rows are created.
const syncLeaveBalances = async (employees, leaveTypes, year) => {
    if (!employees.length || !leaveTypes.length) return;

    const employeeIds = employees.map((e) => e._id);
    const leaveTypeIds = leaveTypes.map((t) => t._id);

    const [totals, balances] = await Promise.all([
        LeaveRequest.aggregate([
            {
                $match: {
                    employeeId: { $in: employeeIds },
                    leaveType: { $in: leaveTypeIds },
                    status: { $in: ["Approved", "Pending"] },
                    startDate: {
                        $gte: new Date(`${year}-01-01T00:00:00.000Z`),
                        $lte: new Date(`${year}-12-31T23:59:59.999Z`),
                    },
                },
            },
            {
                $group: {
                    _id: { employee: "$employeeId", type: "$leaveType", status: "$status" },
                    days: { $sum: "$totalDays" },
                },
            },
        ]),
        LeaveBalance.find({
            year,
            employeeId: { $in: employeeIds },
            leaveType: { $in: leaveTypeIds },
        }).lean(),
    ]);

    const pairKey = (employee, type) => `${employee}|${type}`;
    const usedByPair = new Map();
    const pendingByPair = new Map();
    for (const row of totals) {
        const target = row._id.status === "Approved" ? usedByPair : pendingByPair;
        target.set(pairKey(row._id.employee, row._id.type), Number(row.days) || 0);
    }
    const balanceByPair = new Map();
    for (const balance of balances) {
        const key = pairKey(balance.employeeId, balance.leaveType);
        if (!balanceByPair.has(key)) balanceByPair.set(key, balance);
    }

    const toCreate = [];
    const toUpdate = [];
    for (const employee of employees) {
        for (const leaveType of leaveTypes) {
            const key = pairKey(employee._id, leaveType._id);
            const usedDays = usedByPair.get(key) || 0;
            const pendingDays = pendingByPair.get(key) || 0;
            const balance = balanceByPair.get(key);

            const totalAllocated = balance
                ? Number(balance.totalAllocated)
                : (Number(leaveType.daysAllowedPerYear) || 12);
            // Leave is deducted when approved: balanceDays = totalAllocated - usedDays
            const balanceDays = Math.max(0, totalAllocated - usedDays);

            if (!balance) {
                toCreate.push({
                    employeeId: employee._id,
                    leaveType: leaveType._id,
                    year,
                    totalAllocated,
                    usedDays,
                    pendingDays,
                    balanceDays,
                });
            } else if (
                balance.usedDays !== usedDays ||
                balance.pendingDays !== pendingDays ||
                balance.balanceDays !== balanceDays
            ) {
                toUpdate.push({
                    updateOne: {
                        filter: { _id: balance._id },
                        update: { $set: { usedDays, pendingDays, balanceDays } },
                    },
                });
            }
        }
    }

    if (toCreate.length) await LeaveBalance.insertMany(toCreate);
    if (toUpdate.length) await LeaveBalance.bulkWrite(toUpdate);
};

const BALANCE_FILTER_FIELDS = {
    employeeName: { type: "text" },
    leaveTypeName: { type: "text" },
    year: { type: "number" },
    credited: { type: "number" },
    used: { type: "number" },
    pending: { type: "number" },
    remaining: { type: "number" },
};

const SEARCHABLE_BALANCE_FIELDS = [
    "employeeName", "leaveTypeName", "year", "credited", "used", "pending", "remaining",
];

// Paged listing.
//
// Employee and leave-type names live in other collections and the list is
// ordered by them. Doing that join inside MongoDB ($lookup per balance row)
// measured 1.0-1.6 s for 6,000 balances; three flat reads joined in Node take
// ~60 ms, so the join, search, filters and sort happen here and only the
// requested page leaves the server. Cost per request grows linearly with the
// number of balance rows (fine for tens of thousands; beyond that, store the
// display names on the balance document and move this back into the query).
const sendPagedBalances = async (req, res, paging, scope) => {
    const base = { year: scope.year };
    if (scope.employeeId) base.employeeId = scope.employeeId;
    if (scope.leaveType) base.leaveType = scope.leaveType;

    let balances, employees, leaveTypes;
    try {
        [balances, employees, leaveTypes] = await Promise.all([
            LeaveBalance.find(base).lean(),
            EmployeeMaster.find({}).select("employeeId firstName middleName lastName officialEmail").lean(),
            LeaveType.find({}).select("typeName typeCode isPaid colorCode daysAllowedPerYear").lean(),
        ]);
    } catch (error) {
        // An id that isn't a valid ObjectId can't match anything.
        if (error?.name === "CastError") balances = [];
        else throw error;
    }

    const employeeById = new Map(employees?.map((e) => [String(e._id), e]));
    const leaveTypeById = new Map(leaveTypes?.map((t) => [String(t._id), t]));

    // Same shape and values the unpaged endpoint returns.
    let rows = balances.map((b) => {
        const employee = employeeById.get(String(b.employeeId)) || null;
        const leaveType = leaveTypeById.get(String(b.leaveType)) || null;
        return {
            ...b,
            employeeId: employee,
            leaveType,
            credited: b.totalAllocated,
            used: b.usedDays,
            pending: b.pendingDays,
            remaining: b.balanceDays,
            employeeName: employee
                ? `${employee.firstName || ""} ${employee.lastName || ""} (${employee.employeeId || ""})`
                : "N/A",
            leaveTypeName: leaveType?.typeName || leaveType?.typeCode || "N/A",
        };
    });

    const search = String(req.body.search || "").trim().toLowerCase();
    if (search) {
        rows = rows.filter((row) =>
            SEARCHABLE_BALANCE_FIELDS.some((field) => String(row[field] ?? "").toLowerCase().includes(search)),
        );
    }
    const matchesFilters = buildRowFilter(req.body.filters, BALANCE_FILTER_FIELDS);
    if (matchesFilters) rows = rows.filter(matchesFilters);

    // `_id` last: a total order keeps offset paging stable between requests.
    rows.sort(
        (a, b) =>
            a.employeeName.localeCompare(b.employeeName) ||
            a.leaveTypeName.localeCompare(b.leaveTypeName) ||
            String(a._id).localeCompare(String(b._id)),
    );

    res.status(200).json({
        success: true,
        isAdmin: scope.isAdmin,
        data: rows.slice(paging.skip, paging.skip + paging.limit),
        pagination: buildPagination(paging, rows.length),
    });
};

module.exports.getLeaveBalances = async (req, res) => {
    try {
        const isAdmin = hasAdminRights(req.user);
        const currentYear = Number(req.body?.year) || new Date().getFullYear();

        // Security: Non-Admin can only access their own leave balance
        const currentEmployeeId = req.user?.employee?._id;
        const targetEmployeeId = isAdmin
            ? (req.body?.employeeId || null)
            : currentEmployeeId;

        if (!isAdmin && !currentEmployeeId) {
            return res.status(200).json({
                success: true,
                isAdmin: false,
                data: [],
            });
        }

        const empFilter = targetEmployeeId
            ? { _id: targetEmployeeId }
            : { isActive: { $ne: false } };

        const [employees, leaveTypes] = await Promise.all([
            EmployeeMaster.find(empFilter).select("employeeId firstName middleName lastName officialEmail").lean(),
            LeaveType.find({ isActive: { $ne: false } }).lean(),
        ]);

        // Auto-sync: Ensure every relevant employee and active leave type has a LeaveBalance document for the year.
        // When paging, only a plain first page re-syncs (initial load / reload): later pages
        // and search / filter requests read what that pass already wrote.
        const paging = parsePaging(req.body);
        const isNarrowedQuery =
            String(req.body?.search || "").trim() !== "" ||
            Object.values(req.body?.filters || {}).some((v) => v !== "" && v !== null && v !== undefined);
        if (!paging || (paging.page === 1 && !isNarrowedQuery)) {
            await syncLeaveBalances(employees, leaveTypes, currentYear);
        }

        if (paging) {
            return await sendPagedBalances(req, res, paging, {
                year: currentYear,
                employeeId: targetEmployeeId,
                leaveType: req.body?.leaveType || req.body?.leaveTypeId,
                isAdmin,
            });
        }

        const query = { year: currentYear };
        if (targetEmployeeId) {
            query.employeeId = targetEmployeeId;
        }
        if (req.body?.leaveType || req.body?.leaveTypeId) {
            query.leaveType = req.body.leaveType || req.body.leaveTypeId;
        }

        const balances = await LeaveBalance.find(query)
            .populate("employeeId", "employeeId firstName middleName lastName officialEmail")
            .populate("leaveType", "typeName typeCode isPaid colorCode daysAllowedPerYear")
            .lean();

        const formatted = balances.map((b) => ({
            ...b,
            credited: b.totalAllocated,
            used: b.usedDays,
            pending: b.pendingDays,
            remaining: b.balanceDays,
            employeeName: b.employeeId
                ? `${b.employeeId.firstName || ""} ${b.employeeId.lastName || ""} (${b.employeeId.employeeId || ""})`
                : "N/A",
            leaveTypeName: b.leaveType?.typeName || b.leaveType?.typeCode || "N/A",
        }));

        formatted.sort((a, b) => {
            const empDiff = (a.employeeName || "").localeCompare(b.employeeName || "");
            if (empDiff !== 0) return empDiff;
            return (a.leaveTypeName || "").localeCompare(b.leaveTypeName || "");
        });

        res.status(200).json({
            success: true,
            isAdmin,
            data: formatted,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.getLeaveBalanceById = async (req, res) => {
    try {
        const { _id } = req.body;
        const isAdmin = hasAdminRights(req.user);
        const currentEmployeeId = req.user?.employee?._id;

        const balance = await LeaveBalance.findById(_id)
            .populate("employeeId", "employeeId firstName lastName")
            .populate("leaveType", "typeName typeCode");

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: "Leave balance record not found",
            });
        }

        // Security check: non-admin can only access their own record
        if (!isAdmin && (!currentEmployeeId || balance.employeeId?._id?.toString() !== currentEmployeeId.toString())) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to view another employee's leave balance.",
            });
        }

        const b = balance.toObject();
        b.credited = b.totalAllocated;
        b.used = b.usedDays;
        b.pending = b.pendingDays;
        b.remaining = b.balanceDays;
        b.leaveTypeId = b.leaveType?._id || b.leaveType;

        res.status(200).json({
            success: true,
            data: b,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.addEditLeaveBalance = async (req, res) => {
    try {
        const isAdmin = hasAdminRights(req.user);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only Administrators and HR are authorized to allocate or adjust employee leave balances.",
            });
        }

        const { _id, ...balanceData } = req.body;

        if (balanceData.leaveTypeId && !balanceData.leaveType) {
            balanceData.leaveType = balanceData.leaveTypeId;
        }
        if (balanceData.credited !== undefined && balanceData.totalAllocated === undefined) {
            balanceData.totalAllocated = Number(balanceData.credited) || 0;
        }
        if (balanceData.used !== undefined && balanceData.usedDays === undefined) {
            balanceData.usedDays = Number(balanceData.used) || 0;
        }
        if (balanceData.pending !== undefined && balanceData.pendingDays === undefined) {
            balanceData.pendingDays = Number(balanceData.pending) || 0;
        }

        const totalAllocated = Number(balanceData.totalAllocated ?? 12);
        const usedDays = Number(balanceData.usedDays ?? 0);
        const pendingDays = Number(balanceData.pendingDays ?? 0);
        balanceData.totalAllocated = totalAllocated;
        balanceData.usedDays = usedDays;
        balanceData.pendingDays = pendingDays;
        balanceData.balanceDays = Math.max(0, totalAllocated - usedDays);

        if (_id) {
            const balance = await LeaveBalance.findByIdAndUpdate(_id, balanceData, {
                new: true,
                runValidators: true,
            });

            if (!balance) {
                return res.status(404).json({
                    success: false,
                    message: "Leave balance record not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Leave balance record updated successfully",
                data: balance,
            });
        }

        const balance = await LeaveBalance.create(balanceData);
        res.status(201).json({
            success: true,
            message: "Leave balance created successfully",
            data: balance,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports.deleteLeaveBalanceById = async (req, res) => {
    try {
        const isAdmin = hasAdminRights(req.user);
        if (!isAdmin) {
            return res.status(403).json({
                success: false,
                message: "Only Administrators and HR are authorized to delete employee leave balances.",
            });
        }

        const { _id } = req.body;
        const balance = await LeaveBalance.findByIdAndDelete(_id);

        if (!balance) {
            return res.status(404).json({
                success: false,
                message: "Leave balance record not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave balance record deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
