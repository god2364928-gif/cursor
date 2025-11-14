"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthorizationUrl = getAuthorizationUrl;
exports.exchangeCodeForToken = exchangeCodeForToken;
exports.getCompanies = getCompanies;
exports.getInvoiceTemplates = getInvoiceTemplates;
exports.createInvoice = createInvoice;
exports.downloadInvoicePdf = downloadInvoicePdf;
exports.isAuthenticated = isAuthenticated;
exports.clearTokenCache = clearTokenCache;
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("../db");
dotenv_1.default.config();
const FREEE_CLIENT_ID = process.env.FREEE_CLIENT_ID || '632732953685764';
const FREEE_CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET || 'An9MEyDAacju9EyiLx3jZKeKpqC-aYdkhDGvwsGwHFoQmiwm6jeAVzJyuBo8ttJ0Dj0OOYboVjImkZLoLNeJeQ';
const FREEE_REDIRECT_URI = process.env.FREEE_REDIRECT_URI || 'urn:ietf:wg:oauth:2.0:oob';
const FREEE_API_BASE = 'https://api.freee.co.jp/api/1'; // freee会計 API
const FREEE_INVOICE_API_BASE = 'https://api.freee.co.jp/iv'; // freee請求書 API (수정: /invoice → /iv)
const FREEE_AUTH_BASE = 'https://accounts.secure.freee.co.jp';
// 메모리 캐시 (DB 조회 최소화)
let cachedToken = null;
/**
 * DB에서 토큰 로드
 */
async function loadTokenFromDB() {
    try {
        const result = await db_1.pool.query('SELECT access_token, refresh_token, expires_at FROM freee_tokens ORDER BY id DESC LIMIT 1');
        if (result.rows.length === 0) {
            return false;
        }
        const row = result.rows[0];
        cachedToken = {
            accessToken: row.access_token,
            refreshToken: row.refresh_token,
            expiresAt: parseInt(row.expires_at),
        };
        console.log('✅ freee token loaded from DB');
        return true;
    }
    catch (error) {
        console.error('Error loading token from DB:', error);
        return false;
    }
}
/**
 * DB에 토큰 저장
 */
async function saveTokenToDB(accessToken, refreshToken, expiresAt) {
    try {
        // 기존 토큰 삭제 후 새로 삽입
        await db_1.pool.query('DELETE FROM freee_tokens');
        await db_1.pool.query('INSERT INTO freee_tokens (access_token, refresh_token, expires_at) VALUES ($1, $2, $3)', [accessToken, refreshToken, expiresAt]);
        // 캐시 업데이트
        cachedToken = { accessToken, refreshToken, expiresAt };
        console.log('✅ freee token saved to DB');
    }
    catch (error) {
        console.error('Error saving token to DB:', error);
        throw error;
    }
}
/**
 * OAuth 인증 URL 생성
 */
function getAuthorizationUrl() {
    const url = new URL(`${FREEE_AUTH_BASE}/public_api/authorize`);
    url.searchParams.set('client_id', FREEE_CLIENT_ID);
    url.searchParams.set('redirect_uri', FREEE_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('prompt', 'select_company');
    // freee会計 API 권한 (거래 생성에 필요)
    url.searchParams.set('scope', 'read write');
    console.log('🔗 Authorization URL:', url.toString());
    return url.toString();
}
/**
 * 인증 코드로 액세스 토큰 교환
 */
async function exchangeCodeForToken(code) {
    try {
        const url = `${FREEE_AUTH_BASE}/public_api/token`;
        const params = new URLSearchParams();
        params.set('grant_type', 'authorization_code');
        params.set('client_id', FREEE_CLIENT_ID);
        params.set('client_secret', FREEE_CLIENT_SECRET);
        params.set('code', code);
        params.set('redirect_uri', FREEE_REDIRECT_URI);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (!response.ok) {
            const text = await response.text();
            console.error('Token exchange failed:', response.status, text);
            return { success: false, error: `Token exchange failed: ${response.status}` };
        }
        const data = await response.json();
        const expiresAt = Date.now() + (data.expires_in * 1000);
        // DB에 저장
        await saveTokenToDB(data.access_token, data.refresh_token, expiresAt);
        console.log('✅ freee token obtained and saved successfully');
        return { success: true };
    }
    catch (error) {
        console.error('Token exchange error:', error);
        return { success: false, error: String(error) };
    }
}
/**
 * 토큰 갱신
 */
async function refreshAccessToken() {
    if (!cachedToken) {
        console.error('No cached token available');
        return false;
    }
    try {
        const url = `${FREEE_AUTH_BASE}/public_api/token`;
        const params = new URLSearchParams();
        params.set('grant_type', 'refresh_token');
        params.set('client_id', FREEE_CLIENT_ID);
        params.set('client_secret', FREEE_CLIENT_SECRET);
        params.set('refresh_token', cachedToken.refreshToken);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });
        if (!response.ok) {
            console.error('Token refresh failed:', response.status);
            return false;
        }
        const data = await response.json();
        const expiresAt = Date.now() + (data.expires_in * 1000);
        // DB에 저장
        await saveTokenToDB(data.access_token, data.refresh_token, expiresAt);
        console.log('✅ freee token refreshed and saved successfully');
        return true;
    }
    catch (error) {
        console.error('Token refresh error:', error);
        return false;
    }
}
/**
 * 유효한 액세스 토큰 확인 및 갱신
 */
async function ensureValidToken() {
    // 캐시가 없으면 DB에서 로드
    if (!cachedToken) {
        const loaded = await loadTokenFromDB();
        if (!loaded) {
            return null;
        }
    }
    // 토큰이 여전히 없으면 인증 필요
    if (!cachedToken) {
        return null;
    }
    // 토큰이 5분 이내에 만료되면 갱신
    if (cachedToken.expiresAt - Date.now() < 5 * 60 * 1000) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
            return null;
        }
    }
    return cachedToken.accessToken;
}
/**
 * freee API 호출 헬퍼
 */
async function callFreeeAPI(endpoint, options = {}) {
    const token = await ensureValidToken();
    if (!token) {
        throw new Error('No valid access token. Please authenticate first.');
    }
    const url = `${FREEE_API_BASE}${endpoint}`;
    console.log(`🌐 Calling freee API: ${url}`);
    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ freee API error: ${response.status}`, text);
        throw new Error(`freee API error: ${response.status} ${text}`);
    }
    const data = await response.json();
    console.log('✅ freee API response:', JSON.stringify(data, null, 2));
    return data;
}
/**
 * 사업소 목록 조회 (회계 API 사용)
 */
async function getCompanies() {
    // 회계 API를 사용하여 사업소 목록 조회
    const token = await ensureValidToken();
    if (!token) {
        throw new Error('No valid access token. Please authenticate first.');
    }
    const url = 'https://api.freee.co.jp/api/1/companies';
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`freee API error: ${response.status} ${text}`);
    }
    return response.json();
}
/**
 * 청구서 템플릿 목록 조회 (freee請求書 API)
 */
async function getInvoiceTemplates(companyId) {
    const token = await ensureValidToken();
    if (!token) {
        throw new Error('No valid access token. Please authenticate first.');
    }
    const url = `${FREEE_INVOICE_API_BASE}/invoices/templates?company_id=${companyId}`;
    console.log(`📋 Fetching invoice templates from: ${url}`);
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ Template fetch error: ${response.status}`, text);
        throw new Error(`freee API error: ${response.status} ${text}`);
    }
    const data = await response.json();
    console.log('✅ Templates fetched:', JSON.stringify(data, null, 2));
    return data;
}
/**
 * 청구書 생성 (freee請求書 API 사용)
 */
async function createInvoice(invoiceData) {
    const token = await ensureValidToken();
    if (!token) {
        throw new Error('No valid access token. Please authenticate first.');
    }
    // 먼저 사용 가능한 템플릿 조회
    let templateId;
    try {
        const templates = await getInvoiceTemplates(invoiceData.company_id);
        if (templates && templates.templates && templates.templates.length > 0) {
            templateId = templates.templates[0].id; // 첫 번째 템플릿 사용
            console.log(`📋 Using template ID: ${templateId}`);
        }
    }
    catch (error) {
        console.error('⚠️ Failed to fetch templates, continuing without template_id:', error);
    }
    const partnerName = invoiceData.partner_name + (invoiceData.partner_title || '');
    // 청구서 번호 자동 생성 (YYYYMMDD-HHMMSS 형식)
    const invoiceNumber = `INV-${new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)}`;
    // freee請求書 API 페이로드 (공식 스펙에 따라 필수 필드 포함)
    const freeePayload = {
        company_id: invoiceData.company_id,
        invoice_number: invoiceNumber, // 필수: 청구서 번호
        partner_name: partnerName, // partner_code 대신 partner_name만 사용
        partner_title: invoiceData.partner_title || '御中',
        billing_date: invoiceData.invoice_date, // 필수: 청구일
        due_date: invoiceData.due_date,
        tax_entry_method: invoiceData.tax_entry_method === 'inclusive' ? 'in' : 'out', // 필수: in/out
        tax_fraction: 'round', // 필수: 세금 단수 처리 (round/floor/ceil)
        withholding_tax_entry_method: 'out', // 필수: 원천징수 표시 방법 (in/out)
        lines: invoiceData.invoice_contents.map((item) => ({
            description: item.name,
            quantity: String(item.quantity), // 문자열로 변환
            unit_price: String(item.unit_price), // 문자열로 변환
            tax_rate: item.tax_rate || 10, // 세율 (0, 8, 10)
        })),
    };
    // 템플릿 ID가 있으면 추가
    if (templateId) {
        freeePayload.template_id = templateId;
    }
    if (invoiceData.invoice_title) {
        freeePayload.invoice_title = invoiceData.invoice_title;
    }
    if (invoiceData.payment_bank_info) {
        freeePayload.payment_bank_info = invoiceData.payment_bank_info;
    }
    console.log('📤 Sending to freee請求書 API:', JSON.stringify(freeePayload, null, 2));
    const url = `${FREEE_INVOICE_API_BASE}/invoices`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(freeePayload),
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ freee請求書 API error: ${response.status}`, text);
        throw new Error(`freee API error: ${response.status} ${text}`);
    }
    const data = await response.json();
    console.log('✅ freee請求書 API response:', JSON.stringify(data, null, 2));
    return data;
}
/**
 * 청구서 PDF 다운로드 (freee会計 API)
 */
async function downloadInvoicePdf(companyId, invoiceId) {
    const token = await ensureValidToken();
    if (!token) {
        throw new Error('No valid access token. Please authenticate first.');
    }
    const url = `${FREEE_API_BASE}/invoices/${invoiceId}/download?company_id=${companyId}`;
    console.log(`📥 Downloading PDF from: ${url}`);
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const text = await response.text();
        console.error(`❌ PDF download error: ${response.status}`, text);
        throw new Error(`freee PDF download error: ${response.status} ${text}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    console.log(`✅ PDF downloaded: ${arrayBuffer.byteLength} bytes`);
    return Buffer.from(arrayBuffer);
}
/**
 * 인증 상태 확인
 */
async function isAuthenticated() {
    // 캐시가 없으면 DB에서 로드
    if (!cachedToken) {
        await loadTokenFromDB();
    }
    return cachedToken !== null && cachedToken.expiresAt > Date.now();
}
/**
 * 캐시 초기화 (재인증 시 사용)
 */
function clearTokenCache() {
    cachedToken = null;
    console.log('🗑️ Token cache cleared');
}
//# sourceMappingURL=freeeClient.js.map