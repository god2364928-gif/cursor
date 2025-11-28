"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const google_trends_api_1 = __importDefault(require("google-trends-api"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const PYTHON_BIN = process.env.TRENDKIT_PYTHON_BIN || 'python3';
const TRENDS_TIMEOUT = Number(process.env.TRENDKIT_TIMEOUT_MS || 60000);
const REPO_ROOT = path_1.default.resolve(__dirname, '..', '..', '..', '..');
const createError = (message) => ({
    status: 'error',
    message,
});
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { keyword, geo, lang, timeframe } = req.body;
    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
        return res.status(400).json(createError('키워드를 입력해 주세요.'));
    }
    const geoCode = (geo || process.env.DEFAULT_GEO || 'JP').toUpperCase();
    const language = (lang || process.env.DEFAULT_LANG || 'ja').toLowerCase();
    const timeRange = timeframe || process.env.DEFAULT_TIMEFRAME || 'today 12-m';
    const trimmedKeyword = keyword.trim();
    try {
        const pythonResult = await runPythonSummary(trimmedKeyword, geoCode, language, timeRange);
        if (pythonResult?.status === 'success') {
            return res.json(pythonResult);
        }
        console.warn('[KeywordAnalysis] Python summary unavailable, attempting Node fallback', pythonResult);
    }
    catch (error) {
        console.error('[KeywordAnalysis] Python summary failed, attempting Node fallback', error);
    }
    try {
        const fallbackResult = await buildFallbackSummary(trimmedKeyword, geoCode, language, timeRange);
        return res.json(fallbackResult);
    }
    catch (error) {
        console.error('[KeywordAnalysis] Fallback summary failed', error);
        return res
            .status(502)
            .json(createError('트렌드 요약 정보를 가져오지 못했습니다. 환경 설정을 다시 확인해 주세요.'));
    }
});
function runPythonSummary(keyword, geo, lang, timeframe) {
    return new Promise((resolve, reject) => {
        const args = ['-m', 'trendkit.api', '--keyword', keyword, '--geo', geo, '--lang', lang, '--timeframe', timeframe];
        const child = (0, child_process_1.spawn)(PYTHON_BIN, args, {
            cwd: REPO_ROOT,
            stdio: ['ignore', 'pipe', 'pipe'],
            env: {
                ...process.env,
            },
        });
        let stdout = '';
        let stderr = '';
        let timeoutHandle = null;
        const cleanup = () => {
            if (timeoutHandle) {
                clearTimeout(timeoutHandle);
            }
        };
        timeoutHandle = setTimeout(() => {
            child.kill('SIGKILL');
            cleanup();
            reject(new Error('Python keyword summary timed out'));
        }, TRENDS_TIMEOUT);
        child.stdout.on('data', (chunk) => {
            stdout += chunk.toString();
        });
        child.stderr.on('data', (chunk) => {
            stderr += chunk.toString();
        });
        child.on('error', (error) => {
            cleanup();
            reject(error);
        });
        child.on('close', (code) => {
            cleanup();
            if (code !== 0 && code !== null) {
                console.error('[KeywordAnalysis] Python exited with code', code, stderr);
            }
            try {
                const parsed = JSON.parse(stdout || '{}');
                resolve(parsed);
            }
            catch (parseError) {
                console.error('[KeywordAnalysis] Failed to parse python output', parseError, stdout, stderr);
                reject(parseError);
            }
        });
    });
}
function subtractMonths(base, months) {
    const date = new Date(base);
    date.setMonth(date.getMonth() - months);
    return date;
}
function subtractYears(base, years) {
    const date = new Date(base);
    date.setFullYear(date.getFullYear() - years);
    return date;
}
function computeTimeWindow(timeframe) {
    const endTime = new Date();
    let startTime;
    switch (timeframe) {
        case 'today 3-m':
            startTime = subtractMonths(endTime, 3);
            break;
        case 'today 5-y':
            startTime = subtractYears(endTime, 5);
            break;
        case 'today 12-m':
        default:
            startTime = subtractMonths(endTime, 12);
            break;
    }
    return { startTime, endTime };
}
function formatDate(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}
const weekdayLabels = {
    ja: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
    ko: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
};
function buildInsights(lang, monthlyRanking, weekdayRanking) {
    const insights = {};
    const locale = lang === 'ko' ? 'ko' : 'ja';
    if (monthlyRanking.length > 0) {
        const top = monthlyRanking[0];
        insights.top_month =
            locale === 'ja'
                ? `検索関心が最も高かった月: ${top.label_ja}`
                : `검색 관심이 가장 높았던 달: ${top.label_ko}`;
    }
    if (weekdayRanking.length > 0) {
        const top = weekdayRanking[0];
        insights.top_weekday =
            locale === 'ja'
                ? `ピーク曜日: ${top.label_ja}`
                : `관심이 높은 요일: ${top.label_ko}`;
    }
    return insights;
}
async function buildFallbackSummary(keyword, geo, lang, timeframe) {
    const { startTime, endTime } = computeTimeWindow(timeframe);
    const hl = lang === 'ko' ? 'ko' : 'ja';
    let interestPayload = null;
    try {
        const interestResponse = await google_trends_api_1.default.interestOverTime({
            keyword,
            geo,
            startTime,
            endTime,
            hl,
        });
        interestPayload = JSON.parse(interestResponse || '{}');
    }
    catch (error) {
        console.error('[KeywordAnalysis] interestOverTime fallback failed', error);
    }
    const timelineData = interestPayload?.default?.timelineData ?? [];
    const timeSeries = timelineData.map((entry) => {
        const timestamp = Number(entry.time) * 1000;
        const date = new Date(timestamp);
        return {
            date: formatDate(date),
            value: entry.value?.[0] ?? 0,
            isPartial: Boolean(entry.isPartial),
        };
    });
    const monthlyMap = new Map();
    timeSeries.forEach(({ date, value }) => {
        const [yearStr, monthStr] = date.split('-');
        const key = `${yearStr}-${monthStr}`;
        if (!monthlyMap.has(key)) {
            monthlyMap.set(key, {
                values: [],
                year: Number(yearStr),
                month: Number(monthStr),
            });
        }
        monthlyMap.get(key).values.push(value);
    });
    const monthlyRanking = Array.from(monthlyMap.entries())
        .map(([month, info]) => {
        const average = info.values.reduce((sum, val) => sum + val, 0) / (info.values.length || 1);
        return {
            month,
            average_score: Number(average.toFixed(2)),
            label_ja: `${info.year}年${info.month}月`,
            label_ko: `${info.year}년 ${info.month}월`,
        };
    })
        .sort((a, b) => b.average_score - a.average_score)
        .map((row, index) => ({
        rank: index + 1,
        ...row,
    }));
    const weekdayMap = new Map();
    timeSeries.forEach(({ date, value }) => {
        const weekday = new Date(date).getDay();
        if (!weekdayMap.has(weekday)) {
            weekdayMap.set(weekday, []);
        }
        weekdayMap.get(weekday).push(value);
    });
    const weekdayRanking = Array.from(weekdayMap.entries())
        .map(([weekday, values]) => {
        const average = values.reduce((sum, val) => sum + val, 0) / (values.length || 1);
        return {
            weekday: weekdayLabels.ja[weekday],
            average_score: Number(average.toFixed(2)),
            label_ja: weekdayLabels.ja[weekday],
            label_ko: weekdayLabels.ko[weekday],
        };
    })
        .sort((a, b) => b.average_score - a.average_score)
        .map((row, index) => ({
        rank: index + 1,
        ...row,
    }));
    const weeklyPeaks = timeSeries
        .slice()
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((entry, index) => ({
        rank: index + 1,
        week_start: entry.date,
        value: Number(entry.value.toFixed(2)),
    }));
    const insights = buildInsights(lang, monthlyRanking, weekdayRanking);
    let relatedTop = [];
    let relatedRising = [];
    try {
        const relatedResponse = await google_trends_api_1.default.relatedQueries({
            keyword,
            geo,
            startTime,
            endTime,
            hl,
        });
        const relatedPayload = JSON.parse(relatedResponse || '{}');
        const rankedList = relatedPayload?.default?.rankedList ?? [];
        if (rankedList[0]?.rankedKeyword) {
            relatedTop = rankedList[0].rankedKeyword.slice(0, 10).map((item) => ({
                query: item.query,
                value: item.value ?? null,
            }));
        }
        if (rankedList[1]?.rankedKeyword) {
            relatedRising = rankedList[1].rankedKeyword.slice(0, 10).map((item) => ({
                query: item.query,
                value: item.value ?? null,
            }));
        }
    }
    catch (error) {
        console.warn('[KeywordAnalysis] related queries fallback failed', error);
    }
    const locale = lang === 'ko' ? 'ko' : 'ja';
    const places = locale === 'ja'
        ? {
            status: 'placeholder',
            message: 'Google Places API が未設定のため参考データを表示しています。',
            summary: {},
            examples: [],
        }
        : {
            status: 'placeholder',
            message: 'Google Places API 키가 없어 참고용 안내만 제공됩니다.',
            summary: {},
            examples: [],
        };
    return {
        status: 'success',
        keyword,
        geo,
        lang,
        timeframe,
        generated_at: new Date().toISOString().replace('T', ' ').slice(0, 19),
        ads_warning: true,
        insights,
        time_series: timeSeries,
        monthly_ranking: monthlyRanking,
        weekday_ranking: weekdayRanking,
        weekly_peaks: weeklyPeaks,
        ads_summary: {
            avg_monthly_searches: null,
            competition_index: null,
            low_cpc: null,
            high_cpc: null,
            monthly_breakdown: [],
        },
        related_queries: {
            top: relatedTop,
            rising: relatedRising,
        },
        places,
    };
}
exports.default = router;
//# sourceMappingURL=keywordAnalysis.js.map