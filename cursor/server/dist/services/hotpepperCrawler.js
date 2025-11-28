"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crawlHotpepperDetails = crawlHotpepperDetails;
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
const db_1 = require("../db");
/**
 * HotPepper 상세 페이지 크롤링
 */
async function crawlRestaurantDetail(page, shop_url) {
    const result = {
        tel: null,
        official_homepage: null
    };
    try {
        console.log(`  🌐 페이지 로딩: ${shop_url}`);
        await page.goto(shop_url, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        // 페이지 하단까지 여러 번 스크롤 (동적 콘텐츠 로드 위해)
        for (let i = 0; i < 3; i++) {
            await page.evaluate(`
        (() => {
          window.scrollTo(0, document.body.scrollHeight);
        })()
      `);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        // 최종 콘텐츠 로드 대기
        await new Promise(resolve => setTimeout(resolve, 2000));
        // 1. 전화번호 수집 (전화번호 페이지로 이동)
        try {
            // shop_url에서 /tel/ 페이지 URL 생성
            const telPageUrl = shop_url.replace(/\/$/, '') + '/tel/';
            console.log(`    📞 전화번호 페이지로 이동: ${telPageUrl}`);
            await page.goto(telPageUrl, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
            // 전화번호 추출 (페이지에 직접 표시됨)
            const telText = await page.evaluate(`
        (() => {
          const bodyText = document.body.innerText;
          const telPattern = /\\d{2,4}-\\d{2,4}-\\d{4}/;
          const match = bodyText.match(telPattern);
          return match ? match[0] : null;
        })()
      `);
            if (telText) {
                result.tel = telText;
                console.log(`    ✅ 전화번호: ${result.tel}`);
            }
            else {
                console.log(`    ⚠️  전화번호를 찾을 수 없습니다`);
            }
            // 원래 페이지로 돌아가기
            console.log(`    ↩️  원래 페이지로 복귀: ${shop_url}`);
            await page.goto(shop_url, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        catch (error) {
            console.log(`    ❌ 전화번호 크롤링 에러: ${error}`);
        }
        // 2. 공식 홈페이지 수집
        try {
            // DOM 선택자로 <a> 태그에서 직접 추출
            const homepage = await page.evaluate(`
        (() => {
          // <a> 태그 중에서 "お店のホームページ" 텍스ト를 포함한 것 찾기
          const links = Array.from(document.querySelectorAll('a'));
          
          for (const link of links) {
            const text = link.textContent || '';
            if (text.includes('お店のホームページ') || text.includes('公式HP')) {
              const url = link.href;
              // HotPepper 자체 URL은 제외
              if (url && !url.includes('hotpepper.jp')) {
                return url;
              }
            }
          }
          
          return null;
        })()
      `);
            if (homepage) {
                result.official_homepage = homepage;
                console.log(`    ✅ 공식 홈페이지: ${result.official_homepage}`);
            }
            else {
                console.log(`    ℹ️  공식 홈페이지 없음`);
            }
        }
        catch (error) {
            console.log(`    ❌ 공식 홈페이지 크롤링 에러: ${error}`);
        }
    }
    catch (error) {
        console.log(`    ❌ 페이지 로딩 에러: ${error}`);
    }
    return result;
}
/**
 * 크롤링할 레스토랑 목록 조회
 */
async function getRestaurantsToCrawl(limit = 20) {
    const result = await db_1.pool.query(`
    SELECT id, hotpepper_id, name, shop_url
    FROM hotpepper_restaurants
    WHERE shop_url IS NOT NULL
      AND (tel IS NULL OR tel = '')
      AND is_deleted = false
    ORDER BY collected_at DESC
    LIMIT $1
  `, [limit]);
    return result.rows;
}
/**
 * 데이터베이스 업데이트
 */
async function updateRestaurant(restaurantId, tel, officialHomepage) {
    await db_1.pool.query(`
    UPDATE hotpepper_restaurants
    SET tel = $1,
        official_homepage = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [tel, officialHomepage, restaurantId]);
}
/**
 * 랜덤 대기 (차단 방지)
 */
function randomDelay(min = 3000, max = 6000) {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
}
/**
 * 메인 크롤링 함수
 */
async function crawlHotpepperDetails(batchSize = 20) {
    console.log('='.repeat(60));
    console.log('🍜 HotPepper Restaurant Detail Crawler (Puppeteer)');
    console.log('='.repeat(60));
    const restaurants = await getRestaurantsToCrawl(batchSize);
    const total = restaurants.length;
    if (total === 0) {
        console.log('ℹ️  크롤링할 레스토랑이 없습니다.');
        return { success: 0, error: 0, total: 0 };
    }
    console.log(`📋 크롤링 대상: ${total}개 레스토랑\n`);
    // Puppeteer 브라우저 시작
    const isProduction = process.env.NODE_ENV === 'production';
    const browser = await puppeteer_core_1.default.launch({
        args: isProduction ? chromium_1.default.args : ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: chromium_1.default.defaultViewport,
        executablePath: isProduction
            ? await chromium_1.default.executablePath()
            : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        headless: isProduction ? chromium_1.default.headless : false
    });
    console.log('✅ Puppeteer 브라우저 시작 완료\n');
    let successCount = 0;
    let errorCount = 0;
    try {
        const page = await browser.newPage();
        // User-Agent 설정
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        for (let idx = 0; idx < restaurants.length; idx++) {
            const restaurant = restaurants[idx];
            console.log(`\n[${idx + 1}/${total}] ${restaurant.name}`);
            try {
                // 상세 페이지 크롤링
                const result = await crawlRestaurantDetail(page, restaurant.shop_url);
                // 데이터베이스 업데이트
                if (result.tel || result.official_homepage) {
                    await updateRestaurant(restaurant.id, result.tel, result.official_homepage);
                    successCount++;
                    console.log(`    💾 데이터베이스 업데이트 완료`);
                }
                else {
                    console.log(`    ⚠️  수집된 데이터 없음`);
                }
            }
            catch (error) {
                errorCount++;
                console.log(`    ❌ 에러 발생: ${error}`);
            }
            // 랜덤 대기 (차단 방지)
            if (idx < restaurants.length - 1) {
                const waitTime = Math.floor(Math.random() * 3000) + 3000;
                console.log(`    ⏳ ${(waitTime / 1000).toFixed(1)}초 대기...`);
                await randomDelay(3000, 6000);
            }
        }
    }
    finally {
        await browser.close();
    }
    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('📊 크롤링 완료!');
    console.log(`✅ 성공: ${successCount}개`);
    console.log(`❌ 실패: ${errorCount}개`);
    console.log('='.repeat(60));
    return { success: successCount, error: errorCount, total };
}
//# sourceMappingURL=hotpepperCrawler.js.map