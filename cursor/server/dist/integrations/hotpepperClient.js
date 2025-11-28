"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AREA_CODES = void 0;
exports.searchRestaurants = searchRestaurants;
exports.formatRestaurantForDB = formatRestaurantForDB;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const HOTPEPPER_API_KEY = process.env.HOTPEPPER_API_KEY || '';
const HOTPEPPER_API_BASE = 'http://webservice.recruit.co.jp/hotpepper/gourmet/v1';
/**
 * HotPepper API で店舗を検索
 */
async function searchRestaurants(params) {
    if (!HOTPEPPER_API_KEY) {
        throw new Error('HOTPEPPER_API_KEY is not configured');
    }
    const url = new URL(HOTPEPPER_API_BASE);
    // 必須パラメータ
    url.searchParams.set('key', HOTPEPPER_API_KEY);
    url.searchParams.set('format', 'json');
    // 検索条件
    if (params.keyword) {
        url.searchParams.set('keyword', params.keyword);
    }
    if (params.large_area) {
        url.searchParams.set('large_area', params.large_area);
    }
    if (params.middle_area) {
        url.searchParams.set('middle_area', params.middle_area);
    }
    if (params.lat !== undefined) {
        url.searchParams.set('lat', String(params.lat));
    }
    if (params.lng !== undefined) {
        url.searchParams.set('lng', String(params.lng));
    }
    if (params.range) {
        url.searchParams.set('range', String(params.range));
    }
    // ページング
    url.searchParams.set('count', String(params.count || 100)); // デフォルト100件
    url.searchParams.set('start', String(params.start || 1));
    console.log(`🍜 Calling HotPepper API: ${url.toString().replace(HOTPEPPER_API_KEY, '***')}`);
    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            const text = await response.text();
            console.error(`❌ HotPepper API error: ${response.status}`, text);
            throw new Error(`HotPepper API error: ${response.status} ${text}`);
        }
        const data = await response.json();
        const shopCount = data.results?.shop?.length || 0;
        const totalAvailable = data.results?.results_available || 0;
        console.log(`✅ HotPepper API response: ${shopCount} shops returned, ${totalAvailable} total available`);
        return data;
    }
    catch (error) {
        console.error('HotPepper API call failed:', error);
        throw error;
    }
}
/**
 * 主要エリアコード (参考用)
 */
exports.AREA_CODES = {
    // 大エリアコード
    TOKYO: 'Z011', // 東京
    OSAKA: 'Z014', // 大阪
    KYOTO: 'Z015', // 京都
    KOBE: 'Z016', // 神戸
    NAGOYA: 'Z012', // 名古屋
    FUKUOKA: 'Z092', // 福岡
    SAPPORO: 'Z001', // 札幌
    SENDAI: 'Z041', // 仙台
    HIROSHIMA: 'Z081', // 広島
    YOKOHAMA: 'Z021', // 横浜
};
/**
 * 検索結果をデータベース用にフォーマット
 */
function formatRestaurantForDB(shop, searchKeyword, searchArea) {
    return {
        hotpepper_id: shop.id,
        name: shop.name,
        tel: shop.tel || null,
        address: shop.address,
        budget_average: shop.budget?.average || shop.budget?.name || null,
        catch_phrase: shop.catch || null,
        shop_url: shop.urls?.pc || null,
        search_keyword: searchKeyword || null,
        search_area: searchArea || null,
    };
}
//# sourceMappingURL=hotpepperClient.js.map