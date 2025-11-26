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
      // "電話番号を表示する" 버튼 찾기 및 클릭
      const telButtonSelectors = [
        'a:has-text("電話番号を表示")',
        'a.telView',
        'button:has-text("電話番号を表示")',
        '.shopTel a:has-text("表示")'
      ]

      let buttonClicked = false
      for (const selector of telButtonSelectors) {
        try {
          const button = await page.$(selector)
          if (button) {
            console.log(`    📞 전화번호 버튼 발견, 클릭...`)
            await button.click()
            buttonClicked = true
            await page.waitForTimeout(1000)
            break
          }
        } catch (e) {
          continue
        }
      }

      // 전화번호 추출
      const telSelectors = [
        'span.telView',
        '.tel span',
        '.shopTel span',
        '#telView'
      ]

      for (const selector of telSelectors) {
        try {
          const telElement = await page.$(selector)
          if (telElement) {
            const telText = await page.evaluate((el: any) => el.textContent, telElement)
            if (telText && telText.trim().length > 5) {
              result.tel = telText.trim()
              console.log(`    ✅ 전화번호: ${result.tel}`)
              break
            }
          }
        } catch (e) {
          continue
        }
      }

      if (!result.tel) {
        console.log(`    ⚠️  전화번호를 찾을 수 없습니다`)
      }

    } catch (error) {
      console.log(`    ❌ 전화번호 크롤링 에러: ${error}`)
    }

    // 2. 공식 홈페이지 수집
    try {
      const homepageSelectors = [
        'th:has-text("お店のホームページ") + td a',
        'dt:has-text("お店のホームページ") + dd a',
        'th:has-text("公式HP") + td a',
        'a[href*="http"]:has-text("HP")'
      ]

      for (const selector of homepageSelectors) {
        try {
          const homepageElement = await page.$(selector)
          if (homepageElement) {
            const href = await page.evaluate((el: any) => el.href, homepageElement)
            // HotPepper 자체 URL은 제외
            if (href && !href.includes('hotpepper.jp')) {
              result.official_homepage = href
              console.log(`    ✅ 공식 홈페이지: ${result.official_homepage}`)
              break
            }
          }
        } catch (e) {
          continue
        }
      }

      if (!result.official_homepage) {
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

