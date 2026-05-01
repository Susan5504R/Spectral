const express = require("express");
const router = express.Router();
const { sequelize, Activity } = require("../db");
const { QueryTypes } = require("sequelize");
const { authenticateToken } = require("../auth");

// GET /activity/:userId — last 365 days, grouped by date, with level 0–4.
// Gap dates are filled with count=0 so the calendar grid is always complete.
router.get("/:userId", authenticateToken, async (req, res) => {
    const { userId } = req.params;

    if (!userId || userId.trim() === "") {
        return res.status(400).json({ error: "Invalid userId." });
    }

    if (userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied." });
    }

    try {
        // Composite index on (userId, createdAt) makes this an index scan, not a full table scan.
        const rows = await sequelize.query(
            `
            SELECT
                DATE("createdAt" AT TIME ZONE 'UTC') AS activity_date,
                COUNT(*)::int                         AS daily_count
            FROM "Activities"
            WHERE "userId" = :userId
              AND "createdAt" >= NOW() - INTERVAL '1 year'
            GROUP BY activity_date
            ORDER BY activity_date ASC
            `,
            { replacements: { userId }, type: QueryTypes.SELECT }
        );

        const countMap = {};
        for (const row of rows) {
            const dateStr = new Date(row.activity_date).toISOString().split("T")[0];
            countMap[dateStr] = row.daily_count;
        }

        // Fill all 365 days so the calendar has no holes.
        const result = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            const count = countMap[dateStr] || 0;

            let level = 0;
            if      (count >= 1 && count <= 2) level = 1;
            else if (count >= 3 && count <= 5) level = 2;
            else if (count >= 6 && count <= 9) level = 3;
            else if (count >= 10)              level = 4;

            result.push({ date: dateStr, count, level });
        }

        const totalSubmissions = result.reduce((s, d) => s + d.count, 0);
        const activeDays       = result.filter(d => d.count > 0).length;
        const maxStreak        = computeMaxStreak(result);
        const currentStreak    = computeCurrentStreak(result);

        res.json({
            userId,
            activity: result,
            stats: { totalSubmissions, activeDays, maxStreak, currentStreak },
        });
    } catch (err) {
        console.error("[ACTIVITY]", err);
        res.status(500).json({ error: "Failed to fetch activity." });
    }
});

// POST /activity/:userId — log an activity entry (called internally after a submission).
router.post("/:userId", authenticateToken, async (req, res) => {
    const { userId } = req.params;

    if (userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied." });
    }

    const { type = "submission", submissionId } = req.body;
    try {
        const record = await Activity.create({ userId, type, submissionId: submissionId || null });
        res.status(201).json(record);
    } catch (err) {
        console.error("[ACTIVITY]", err);
        res.status(500).json({ error: "Failed to log activity." });
    }
});

function computeMaxStreak(days) {
    let max = 0, cur = 0;
    for (const d of days) {
        if (d.count > 0) { cur++; max = Math.max(max, cur); }
        else              { cur = 0; }
    }
    return max;
}

// Walk backwards from today to find the unbroken active-day run.
function computeCurrentStreak(days) {
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].count > 0) streak++;
        else break;
    }
    return streak;
}

module.exports = router;
