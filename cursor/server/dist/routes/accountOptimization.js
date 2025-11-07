"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const undici_1 = require("undici");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const DEFAULT_ENDPOINT = 'https://api.growthcore.co.kr/api/thirdparty/id-analytics';
const createErrorResponse = (message) => ({
    status: 'error',
    message,
});
router.get('/', auth_1.authMiddleware, async (req, res) => {
    const id = String(req.query.id ?? '').trim();
    if (!id) {
        return res
            .status(400)
            .json(createErrorResponse('インスタグラムIDを入力してください。'));
    }
    const apiKey = process.env.ACCOUNT_OPTIMIZATION_API_KEY ||
        process.env.INSTAGRAM_ANALYTICS_API_KEY ||
        '';
    if (!apiKey) {
        console.error('[AccountOptimization] Missing API key environment variable');
        return res
            .status(500)
            .json(createErrorResponse('外部連携キーが設定されていません。'));
    }
    const endpoint = process.env.ACCOUNT_OPTIMIZATION_API_URL ||
        process.env.INSTAGRAM_ANALYTICS_API_URL ||
        DEFAULT_ENDPOINT;
    try {
        const url = new URL(endpoint);
        url.searchParams.set('id', id);
        const upstreamResponse = await (0, undici_1.fetch)(url, {
            method: 'GET',
            headers: {
                'X-Auth-Key': apiKey,
                Accept: 'application/json',
            },
        });
        const rawText = await upstreamResponse.text();
        let payload = null;
        if (rawText) {
            try {
                payload = JSON.parse(rawText);
            }
            catch (parseError) {
                console.error('[AccountOptimization] Failed to parse response JSON', parseError);
                payload = createErrorResponse('外部サービスの応答を解析できませんでした。');
            }
        }
        if (!upstreamResponse.ok) {
            const statusCode = upstreamResponse.status || 502;
            return res.status(statusCode).json(payload ||
                createErrorResponse('外部サービスからエラーが返されました。少し時間を置いて再度お試しください。'));
        }
        if (!payload) {
            return res
                .status(502)
                .json(createErrorResponse('外部サービスから空の応答が返されました。'));
        }
        return res.json(payload);
    }
    catch (error) {
        console.error('[AccountOptimization] Request failed', error);
        return res
            .status(502)
            .json(createErrorResponse('外部サービス呼び出しに失敗しました。再度お試しください。'));
    }
});
exports.default = router;
//# sourceMappingURL=accountOptimization.js.map