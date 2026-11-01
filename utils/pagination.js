/**
 * Opt-in server-side pagination helpers for list endpoints.
 *
 * An endpoint is "paged" only when the request body carries `limit`. Without
 * it the endpoint keeps returning the full list exactly as before, so every
 * existing screen (and report) that calls it keeps working untouched.
 *
 * Paged request body:
 *   { page: 1, limit: 50, search: "text", filters: { field: "value" } }
 * Paged response:
 *   { success: true, data: [...], pagination: { page, limit, total, hasMore } }
 *
 * `search` and `filters` mirror what the grid does client-side (substring for
 * text, `>`/`>=`/`<`/`<=`/`=` prefixes for numbers and dates), so switching a
 * screen to paged mode does not change what a search or column filter finds.
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Returns null for a legacy (unpaged) request.
const parsePaging = (body = {}) => {
    if (body.limit === undefined || body.limit === null || body.limit === "") return null;
    const limit = Math.min(Math.max(parseInt(body.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const page = Math.max(parseInt(body.page, 10) || 1, 1);
    return { page, limit, skip: (page - 1) * limit };
};

const buildPagination = ({ page, limit }, total) => ({
    page,
    limit,
    total,
    hasMore: page * limit < total,
});

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Case-insensitive "contains", like the grid's text filter.
const containsRegex = (value) => new RegExp(escapeRegex(String(value).trim()), "i");

const OPERATOR_RE = /^(>=|<=|>|<|=)?\s*(.+)$/;
const NUMERIC_OPS = { ">": "$gt", ">=": "$gte", "<": "$lt", "<=": "$lte" };

// "12", ">5", "<=3" -> Mongo condition. null when the text isn't a number.
const numberCondition = (raw) => {
    const match = String(raw).trim().match(OPERATOR_RE);
    if (!match) return null;
    const value = Number(match[2]);
    if (!Number.isFinite(value)) return null;
    return match[1] && NUMERIC_OPS[match[1]] ? { [NUMERIC_OPS[match[1]]]: value } : value;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// "2026-01-05", ">=2026-01-01" -> Mongo condition on a Date field, treating
// each value as a whole UTC day (the way dates are stored here).
const dateCondition = (raw) => {
    const match = String(raw).trim().match(OPERATOR_RE);
    if (!match) return null;
    const operand = match[2].trim();

    const monthMatch = /^(\d{4})-(\d{2})$/.exec(operand);
    if (monthMatch) {
        const year = Number(monthMatch[1]);
        const month = Number(monthMatch[2]);
        const start = new Date(Date.UTC(year, month - 1, 1));
        if (Number.isNaN(start.getTime())) return null;
        const end = new Date(Date.UTC(year, month, 1));
        switch (match[1]) {
            case ">": return { $gte: end };
            case ">=": return { $gte: start };
            case "<": return { $lt: start };
            case "<=": return { $lt: end };
            default: return { $gte: start, $lt: end };
        }
    }

    const dayStart = new Date(`${operand.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) return null;
    const nextDay = new Date(dayStart.getTime() + DAY_MS);
    switch (match[1]) {
        case ">": return { $gte: nextDay };
        case ">=": return { $gte: dayStart };
        case "<": return { $lt: dayStart };
        case "<=": return { $lt: nextDay };
        default: return { $gte: dayStart, $lt: nextDay };
    }
};

// A search term shaped like a date ("2026-01-05" or "2026-01") as a range.
const dateSearchRange = (term) => {
    const text = String(term).trim();
    let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (match) {
        const start = new Date(`${text}T00:00:00.000Z`);
        return Number.isNaN(start.getTime()) ? null : { $gte: start, $lt: new Date(start.getTime() + DAY_MS) };
    }
    match = /^(\d{4})-(\d{2})$/.exec(text);
    if (match) {
        const start = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
        if (Number.isNaN(start.getTime())) return null;
        return { $gte: start, $lt: new Date(Date.UTC(Number(match[1]), Number(match[2]), 1)) };
    }
    return null;
};

/**
 * Turns `filters` into Mongo conditions using a per-endpoint whitelist, so a
 * client can only filter on fields the endpoint chose to expose.
 *
 * spec: { [gridField]: { type: "text" | "select" | "number" | "date", path } }
 *   `path` is the stored field. Filters on a field missing from the spec are
 *   ignored (never passed to Mongo).
 */
const buildFilterConditions = (filters, spec) => {
    const conditions = [];
    if (!filters || typeof filters !== "object") return conditions;

    for (const [field, raw] of Object.entries(filters)) {
        const entry = spec[field];
        if (!entry || raw === "" || raw === null || raw === undefined) continue;
        const path = entry.path || field;

        let condition = null;
        switch (entry.type) {
            case "number": condition = numberCondition(raw); break;
            case "date": condition = dateCondition(raw); break;
            case "select": condition = String(raw); break;
            default: condition = containsRegex(raw);
        }
        // A number/date filter the user hasn't finished typing is ignored,
        // matching the grid (an unparsable operand keeps every row).
        if (condition !== null) conditions.push({ [path]: condition });
    }
    return conditions;
};

// In-memory twin of buildFilterConditions, for endpoints that assemble rows in
// Node (joined/computed columns) instead of in the query. Same whitelist, same
// text / select / number semantics as the grid. Returns null when no filter is
// active, so callers can skip the pass entirely.
const buildRowFilter = (filters, spec) => {
    if (!filters || typeof filters !== "object") return null;
    const tests = [];

    for (const [field, raw] of Object.entries(filters)) {
        const entry = spec[field];
        if (!entry || raw === "" || raw === null || raw === undefined) continue;

        if (entry.type === "number") {
            const match = String(raw).trim().match(OPERATOR_RE);
            const operand = match ? Number(match[2]) : NaN;
            if (!Number.isFinite(operand)) continue; // half-typed: ignored, like the grid
            const op = match[1];
            tests.push((row) => {
                const value = row[field];
                if (value === "" || value === null || value === undefined) return false;
                const n = Number(value);
                if (Number.isNaN(n)) return false;
                switch (op) {
                    case ">": return n > operand;
                    case "<": return n < operand;
                    case ">=": return n >= operand;
                    case "<=": return n <= operand;
                    default: return n === operand;
                }
            });
        } else if (entry.type === "select") {
            tests.push((row) => String(row[field] ?? "") === String(raw));
        } else {
            const needle = String(raw).toLowerCase();
            tests.push((row) => String(row[field] ?? "").toLowerCase().includes(needle));
        }
    }

    return tests.length ? (row) => tests.every((test) => test(row)) : null;
};

// Whitelisted sort -> Mongo sort with `_id` as the tiebreaker. The tiebreaker
// is what keeps offset paging stable: without it rows with equal sort values
// can swap between pages and appear twice or not at all.
const buildSort = (sort, allowed, fallback) => {
    const field = sort && allowed[sort.field];
    const base = field
        ? { [field]: String(sort.direction).toLowerCase() === "desc" ? -1 : 1 }
        : fallback;
    return { ...base, _id: 1 };
};

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    parsePaging,
    buildPagination,
    escapeRegex,
    containsRegex,
    numberCondition,
    dateCondition,
    dateSearchRange,
    buildFilterConditions,
    buildRowFilter,
    buildSort,
};
