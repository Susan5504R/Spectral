// routes/activity.js
const express = require("express");
const router = express.Router();
const { sequelize, Activity } = require("../db");
const { QueryTypes } = require("sequelize");

/**
 * GET /activity/:userId
 * Returns last 365 days of activity, grouped by date, with level (0–4).
 * Fills in gap dates with count=0 so the calendar grid is always complete.
 */
router.get("/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        // 1. Aggregation query — DB does the heavy lifting
        // Composite index on (userId, createdAt) makes this fast
        const rows = await sequelize.query(
            `
            SELECT
                DATE("createdAt" AT TIME ZONE 'UTC') AS activity_date,
                COUNT(*)::int                          AS daily_count
            FROM "Activities"
            WHERE "userId" = :userId
              AND "createdAt" >= NOW() - INTERVAL '1 year'
            GROUP BY activity_date
            ORDER BY activity_date ASC
            `,
            {
                replacements: { userId },
                type: QueryTypes.SELECT,
            }
        );

        // 2. Build a lookup map of date → count
        const countMap = {};
        for (const row of rows) {
            const dateStr = new Date(row.activity_date).toISOString().split("T")[0];
            countMap[dateStr] = row.daily_count;
        }

        // 3. Fill ALL 365 days (gap-filling so the calendar has no holes)
        const result = [];
        const today = new Date();
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setUTCDate(d.getUTCDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            const count = countMap[dateStr] || 0;

            // 4. Bucketization — map count → level 0–4
            let level = 0;
            if (count >= 1 && count <= 2) level = 1;
            else if (count >= 3 && count <= 5) level = 2;
            else if (count >= 6 && count <= 9) level = 3;
            else if (count >= 10)              level = 4;

            result.push({ date: dateStr, count, level });
        }

        // Correct version:
        const totalSubmissions = result.reduce((s, d) => s + d.count, 0);
        const activeDays = result.filter(d => d.count > 0).length;
        const maxStreak = computeStreak(result);

        res.json({
            userId,
            activity: result,
            stats: {
                totalSubmissions,
                activeDays,
                maxStreak,
            },
        });
    } catch (err) {
        console.error("[ACTIVITY]", err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /activity/:userId
 * Manually log an activity (for testing / direct use).
 */
router.post("/:userId", async (req, res) => {
    const { userId } = req.params;
    const { type = "submission", submissionId } = req.body;
    try {
        const record = await Activity.create({ userId, type, submissionId: submissionId || null });
        res.status(201).json(record);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** Compute max consecutive active-day streak */
function computeStreak(days) {
    let max = 0, cur = 0;
    for (const d of days) {
        if (d.count > 0) {
            cur++;
            max = Math.max(max, cur);
        } else {
            cur = 0;
        }
    }
    return max;
}

// ✅ This is the missing line:
module.exports = router;