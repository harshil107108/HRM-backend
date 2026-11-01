const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Checks if a given date falls on a weekend / weekly off according to the active WeekendPolicy.
 */
function isWeekendDay(dateObj, weekendPolicy) {
    if (!dateObj || Number.isNaN(dateObj.getTime())) return false;
    const dayIndex = dateObj.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[dayIndex];

    if (weekendPolicy && weekendPolicy.isActive !== false && weekendPolicy.status !== "Inactive") {
        const offDays =
            Array.isArray(weekendPolicy.days) && weekendPolicy.days.length > 0
                ? weekendPolicy.days
                : Array.isArray(weekendPolicy.weeklyOffDays) && weekendPolicy.weeklyOffDays.length > 0
                ? weekendPolicy.weeklyOffDays
                : ["Sunday"];

        // 1. Direct weekly off match
        if (offDays.some((d) => d.toLowerCase() === dayName.toLowerCase())) {
            return true;
        }

        const dayOfMonth = dateObj.getUTCDate();
        const occurrenceIndex = Math.floor((dayOfMonth - 1) / 7) + 1;

        // 2. Flexible Alternate Rules
        if (Array.isArray(weekendPolicy.alternateRules) && weekendPolicy.alternateRules.length > 0) {
            const matchingRules = weekendPolicy.alternateRules.filter(
                (r) => r.day && r.day.toLowerCase() === dayName.toLowerCase()
            );
            for (const rule of matchingRules) {
                const p = rule.pattern;
                if (p === "All") return true;
                if (p === "2nd & 4th" && (occurrenceIndex === 2 || occurrenceIndex === 4)) return true;
                if (p === "1st & 3rd" && (occurrenceIndex === 1 || occurrenceIndex === 3)) return true;
                if (p === "1st, 3rd & 5th" && (occurrenceIndex === 1 || occurrenceIndex === 3 || occurrenceIndex === 5)) return true;
            }
        }

        // 3. Fallback alternateDay / alternatePattern
        if (weekendPolicy.alternateDay && weekendPolicy.alternateDay.toLowerCase() === dayName.toLowerCase()) {
            const p = weekendPolicy.alternatePattern || "2nd & 4th";
            if (p === "All") return true;
            if (p === "2nd & 4th" && (occurrenceIndex === 2 || occurrenceIndex === 4)) return true;
            if (p === "1st & 3rd" && (occurrenceIndex === 1 || occurrenceIndex === 3)) return true;
            if (p === "1st, 3rd & 5th" && (occurrenceIndex === 1 || occurrenceIndex === 3 || occurrenceIndex === 5)) return true;
        }

        // 4. Alternate Saturday rule
        if (dayIndex === 6 && weekendPolicy.alternateSaturdayRule) {
            const rule = weekendPolicy.alternateSaturdayRule;
            if (rule === "All Saturdays Off" || rule === "All") return true;
            if (rule.includes("2nd & 4th") && (occurrenceIndex === 2 || occurrenceIndex === 4)) return true;
            if (rule.includes("1st & 3rd") && (occurrenceIndex === 1 || occurrenceIndex === 3)) return true;
        }

        return false;
    }

    // Default standard fallback: Sunday always off, 2nd & 4th Saturday off
    if (dayIndex === 0) return true;
    if (dayIndex === 6) {
        const occurrenceIndex = Math.floor((dateObj.getUTCDate() - 1) / 7) + 1;
        return occurrenceIndex === 2 || occurrenceIndex === 4;
    }
    return false;
}

/**
 * Checks if a date matches any official holiday.
 */
function getMatchingHoliday(dateStr, holidays = []) {
    if (!dateStr || !Array.isArray(holidays) || holidays.length === 0) return null;
    return holidays.find((h) => {
        if (!h.holidayDate) return false;
        let hDateStr = "";
        if (typeof h.holidayDate === "string") {
            hDateStr = h.holidayDate.slice(0, 10);
        } else if (h.holidayDate instanceof Date) {
            hDateStr = `${h.holidayDate.getUTCFullYear()}-${pad2(h.holidayDate.getUTCMonth() + 1)}-${pad2(h.holidayDate.getUTCDate())}`;
        }
        return hDateStr === dateStr;
    });
}

/**
 * Calculates working days for leave request in backend.
 */
function calculateLeaveWorkingDays({
    startDate,
    endDate,
    isHalfDay = false,
    weekendPolicy = null,
    holidays = [],
}) {
    const sStr = String(startDate).slice(0, 10);
    const eStr = isHalfDay ? sStr : String(endDate || startDate).slice(0, 10);

    const [y1, m1, d1] = sStr.split("-").map(Number);
    const [y2, m2, d2] = eStr.split("-").map(Number);

    const cur = new Date(Date.UTC(y1, m1 - 1, d1));
    const end = new Date(Date.UTC(y2, m2 - 1, d2));

    const workingDays = [];
    const excludedDays = [];
    let holidayCount = 0;
    let weekendCount = 0;
    let totalCalendarDays = 0;

    while (cur <= end) {
        totalCalendarDays++;
        const curYear = cur.getUTCFullYear();
        const curMonth = cur.getUTCMonth() + 1;
        const curDay = cur.getUTCDate();
        const dateStr = `${curYear}-${pad2(curMonth)}-${pad2(curDay)}`;

        const holiday = getMatchingHoliday(dateStr, holidays);
        if (holiday) {
            holidayCount++;
            excludedDays.push({
                date: dateStr,
                type: "Holiday",
                reason: holiday.holidayName || "Official Holiday",
            });
        } else if (isWeekendDay(cur, weekendPolicy)) {
            weekendCount++;
            const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const dayName = dayNames[cur.getUTCDay()];
            excludedDays.push({
                date: dateStr,
                type: "Weekend",
                reason: `${dayName} (Weekly Off)`,
            });
        } else {
            workingDays.push(dateStr);
        }

        cur.setUTCDate(cur.getUTCDate() + 1);
    }

    let totalWorkingDays = workingDays.length;
    if (isHalfDay) {
        totalWorkingDays = workingDays.length > 0 ? 0.5 : 0;
    }

    return {
        totalWorkingDays,
        totalCalendarDays,
        workingDays,
        excludedDays,
        isAllNonWorking: totalWorkingDays === 0,
        hasExcludedDays: excludedDays.length > 0,
        holidayCount,
        weekendCount,
    };
}

module.exports = {
    isWeekendDay,
    getMatchingHoliday,
    calculateLeaveWorkingDays,
};

