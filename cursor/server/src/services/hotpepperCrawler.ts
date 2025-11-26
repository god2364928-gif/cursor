import puppeteer from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import { pool } from '../db'

interface CrawlResult {
  tel: string | null
  official_homepage: string | null
}

interface Restaurant {
  id: string
  hotpepper_id: string
  name: string
  shop_url: string
}

/**
 * HotPepper 상세 페이지 크롤링
 */
async function crawlRestaurantDetail(page: any, shop_url: string): Promise<CrawlResult> {
  const result: CrawlResult = {
    tel: null,
    official_homepage: null
  }

  try {
    console.log(`  🌐 페이지 로딩: ${shop_url}`)
    await page.goto(shop_url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })

    // 1. 전화번호 수집
    try {
      // "電話番号を表示する" 링크 찾기 및 클릭
      const buttonFound = await page.evaluate(`
        (() => {
          const links = Array.from(document.querySelectorAll('a'));
          const telButton = links.find(link => link.textContent?.includes('電話番号を表示'));
          if (telButton) {
            telButton.click();
            return true;
          }
          return false;
        })()
      `)

      if (buttonFound) {
        console.log(`    📞 전화번호 버튼 클릭 완료, 대기 중...`)
        await new Promise(resolve => setTimeout(resolve, 1500))  // 전화번호 표시 대기

        // 클릭 후 나타나는 전화번호 추출
        const telText = await page.evaluate(`
          (() => {
            const bodyText = document.body.innerText;
            const telPattern = /\\d{2,4}-\\d{2,4}-\\d{4}/;
            const match = bodyText.match(telPattern);
            return match ? match[0] : null;
          })()
        `)

        if (telText) {
          result.tel = telText
          console.log(`    ✅ 전화번호: ${result.tel}`)
        } else {
          console.log(`    ⚠️  전화번호를 찾을 수 없습니다`)
        }
      } else {
        console.log(`    ⚠️  전화번호 버튼을 찾을 수 없습니다`)
      }

    } catch (error) {
      console.log(`    ❌ 전화번호 크롤링 에러: ${error}`)
    }

    // 2. 공식 홈페이지 수집
    try {
      // "お店のホームページ：https://..." 형식으로 페이지 내 텍스트에서 추출
      const homepageResult = await page.evaluate(`
        (() => {
          const bodyText = document.body.innerText;
          
          // 디버깅: "お店のホームページ" 텍스트가 있는지 확인
          const hasHomepageText = bodyText.includes('お店のホームページ');
          const has公式HP = bodyText.includes('公式HP');
          
          // "お店のホームページ" 또는 "公式HP" 텍스트가 포함된 줄 찾기
          const lines = bodyText.split('\\n');
          let foundLine = null;
          
          for (const line of lines) {
            if (line.includes('お店のホームページ') || line.includes('公式HP')) {
              foundLine = line;
              // URL 패턴 찾기 (https:// 또는 http://로 시작)
              const urlMatch = line.match(/(https?:\\/\\/[^\\s、。，）)\\n]+)/);
              if (urlMatch && urlMatch[1]) {
                const url = urlMatch[1].trim();
                // HotPepper 자체 URL은 제외
                if (!url.includes('hotpepper.jp')) {
                  return {
                    success: true,
                    url: url,
                    debug: { hasHomepageText, has公式HP, foundLine }
                  };
                }
              }
            }
          }
          
          return {
            success: false,
            url: null,
            debug: { hasHomepageText, has公式HP, foundLine }
          };
        })()
      `)

      console.log(`    🔍 디버그: ${JSON.stringify(homepageResult.debug)}`)
      
      if (homepageResult.success && homepageResult.url) {
        result.official_homepage = homepageResult.url
        console.log(`    ✅ 공식 홈페이지: ${result.official_homepage}`)
      } else {
        console.log(`    ℹ️  공식 홈페이지 없음`)
      }

    } catch (error) {
      console.log(`    ❌ 공식 홈페이지 크롤링 에러: ${error}`)
    }

  } catch (error) {
    console.log(`    ❌ 페이지 로딩 에러: ${error}`)
  }

  return result
}

/**
 * 크롤링할 레스토랑 목록 조회
 */
async function getRestaurantsToCrawl(limit: number = 20): Promise<Restaurant[]> {
  const result = await pool.query(`
    SELECT id, hotpepper_id, name, shop_url
    FROM hotpepper_restaurants
    WHERE shop_url IS NOT NULL
      AND (tel IS NULL OR tel = '')
      AND is_deleted = false
    ORDER BY collected_at DESC
    LIMIT $1
  `, [limit])

  return result.rows
}

/**
 * 데이터베이스 업데이트
 */
async function updateRestaurant(restaurantId: string, tel: string | null, officialHomepage: string | null): Promise<void> {
  await pool.query(`
    UPDATE hotpepper_restaurants
    SET tel = $1,
        official_homepage = $2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $3
  `, [tel, officialHomepage, restaurantId])
}

/**
 * 랜덤 대기 (차단 방지)
 */
function randomDelay(min: number = 3000, max: number = 6000): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise(resolve => setTimeout(resolve, delay))
}

/**
 * 메인 크롤링 함수
 */
export async function crawlHotpepperDetails(batchSize: number = 20): Promise<{
  success: number
  error: number
  total: number
}> {
  console.log('=' .repeat(60))
  console.log('🍜 HotPepper Restaurant Detail Crawler (Puppeteer)')
  console.log('='.repeat(60))

  const restaurants = await getRestaurantsToCrawl(batchSize)
  const total = restaurants.length

  if (total === 0) {
    console.log('ℹ️  크롤링할 레스토랑이 없습니다.')
    return { success: 0, error: 0, total: 0 }
  }

  console.log(`📋 크롤링 대상: ${total}개 레스토랑\n`)

  // Puppeteer 브라우저 시작
  const isProduction = process.env.NODE_ENV === 'production'
  
  const browser = await puppeteer.launch({
    args: isProduction ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: chromium.defaultViewport,
    executablePath: isProduction 
      ? await chromium.executablePath()
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: isProduction ? chromium.headless : false
  })

  console.log('✅ Puppeteer 브라우저 시작 완료\n')

  let successCount = 0
  let errorCount = 0

  try {
    const page = await browser.newPage()
    
    // User-Agent 설정
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    for (let idx = 0; idx < restaurants.length; idx++) {
      const restaurant = restaurants[idx]
      console.log(`\n[${idx + 1}/${total}] ${restaurant.name}`)

      try {
        // 상세 페이지 크롤링
        const result = await crawlRestaurantDetail(page, restaurant.shop_url)

        // 데이터베이스 업데이트
        if (result.tel || result.official_homepage) {
          await updateRestaurant(restaurant.id, result.tel, result.official_homepage)
          successCount++
          console.log(`    💾 데이터베이스 업데이트 완료`)
        } else {
          console.log(`    ⚠️  수집된 데이터 없음`)
        }

      } catch (error) {
        errorCount++
        console.log(`    ❌ 에러 발생: ${error}`)
      }

      // 랜덤 대기 (차단 방지)
      if (idx < restaurants.length - 1) {
        const waitTime = Math.floor(Math.random() * 3000) + 3000
        console.log(`    ⏳ ${(waitTime / 1000).toFixed(1)}초 대기...`)
        await randomDelay(3000, 6000)
      }
    }

  } finally {
    await browser.close()
  }

  // 결과 요약
  console.log('\n' + '='.repeat(60))
  console.log('📊 크롤링 완료!')
  console.log(`✅ 성공: ${successCount}개`)
  console.log(`❌ 실패: ${errorCount}개`)
  console.log('='.repeat(60))

  return { success: successCount, error: errorCount, total }
}

