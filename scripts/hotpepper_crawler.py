#!/usr/bin/env python3
"""
HotPepper Restaurant Detail Crawler
크롤링하여 전화번호와 공식 홈페이지를 수집하고 데이터베이스를 업데이트합니다.
"""

import os
import sys
import time
import random
import psycopg2
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# 데이터베이스 연결 정보
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway')

# 크롤링 설정
BATCH_SIZE = int(os.getenv('CRAWL_BATCH_SIZE', '20'))  # 한 번에 처리할 레코드 수
MIN_WAIT = 3  # 최소 대기 시간 (초)
MAX_WAIT = 6  # 최대 대기 시간 (초)


def setup_driver():
    """Selenium WebDriver 설정"""
    options = webdriver.ChromeOptions()
    options.add_argument('--headless=false')  # 브라우저 보이기
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
    
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(10)
    return driver


def get_restaurants_to_crawl(conn, limit=BATCH_SIZE):
    """크롤링할 레스토랑 목록 조회 (전화번호가 없는 것들)"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, hotpepper_id, name, shop_url
        FROM hotpepper_restaurants
        WHERE shop_url IS NOT NULL
          AND (tel IS NULL OR tel = '')
          AND is_deleted = false
        ORDER BY collected_at DESC
        LIMIT %s
    """, (limit,))
    
    restaurants = cursor.fetchall()
    cursor.close()
    return restaurants


def crawl_restaurant_detail(driver, shop_url):
    """
    HotPepper 상세 페이지에서 전화번호와 공식 홈페이지 크롤링
    
    Returns:
        tuple: (tel, official_homepage)
    """
    tel = None
    official_homepage = None
    
    try:
        print(f"  🌐 페이지 로딩: {shop_url}")
        driver.get(shop_url)
        time.sleep(2)  # 페이지 로드 대기
        
        # 1. 전화번호 수집
        try:
            # "電話番号を表示する" 버튼 찾기 및 클릭
            tel_button_selectors = [
                "//a[contains(text(), '電話番号を表示')]",
                "//a[contains(@class, 'telView')]",
                "//button[contains(text(), '電話番号を表示')]",
                "//*[contains(@class, 'shopTel')]//a[contains(text(), '表示')]"
            ]
            
            button_clicked = False
            for selector in tel_button_selectors:
                try:
                    button = driver.find_element(By.XPATH, selector)
                    print(f"    📞 전화번호 버튼 발견, 클릭...")
                    button.click()
                    button_clicked = True
                    time.sleep(1)
                    break
                except NoSuchElementException:
                    continue
            
            # 전화번호 추출
            tel_selectors = [
                "//span[contains(@class, 'telView')]",
                "//*[contains(@class, 'tel')]//span",
                "//div[contains(@class, 'shopTel')]//span",
                "//*[@id='telView']"
            ]
            
            for selector in tel_selectors:
                try:
                    tel_element = driver.find_element(By.XPATH, selector)
                    tel_text = tel_element.text.strip()
                    if tel_text and len(tel_text) > 5:  # 최소 전화번호 길이
                        tel = tel_text
                        print(f"    ✅ 전화번호: {tel}")
                        break
                except NoSuchElementException:
                    continue
            
            if not tel:
                print(f"    ⚠️  전화번호를 찾을 수 없습니다")
                
        except Exception as e:
            print(f"    ❌ 전화번호 크롤링 에러: {str(e)}")
        
        # 2. 공식 홈페이지 수집
        try:
            homepage_selectors = [
                "//th[contains(text(), 'お店のホームページ')]/following-sibling::td//a",
                "//dt[contains(text(), 'お店のホームページ')]/following-sibling::dd//a",
                "//th[contains(text(), '公式HP')]/following-sibling::td//a",
                "//*[contains(text(), 'ホームページ')]//following::a[1]",
                "//a[contains(@href, 'http') and contains(text(), 'HP')]"
            ]
            
            for selector in homepage_selectors:
                try:
                    homepage_element = driver.find_element(By.XPATH, selector)
                    href = homepage_element.get_attribute('href')
                    # HotPepper 자체 URL은 제외
                    if href and 'hotpepper.jp' not in href:
                        official_homepage = href
                        print(f"    ✅ 공식 홈페이지: {official_homepage}")
                        break
                except NoSuchElementException:
                    continue
            
            if not official_homepage:
                print(f"    ℹ️  공식 홈페이지 없음")
                
        except Exception as e:
            print(f"    ❌ 공식 홈페이지 크롤링 에러: {str(e)}")
        
    except Exception as e:
        print(f"    ❌ 페이지 로딩 에러: {str(e)}")
    
    return tel, official_homepage


def update_restaurant(conn, restaurant_id, tel, official_homepage):
    """데이터베이스 업데이트"""
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE hotpepper_restaurants
        SET tel = %s,
            official_homepage = %s,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = %s
    """, (tel, official_homepage, restaurant_id))
    conn.commit()
    cursor.close()


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("🍜 HotPepper Restaurant Detail Crawler")
    print("=" * 60)
    
    # 데이터베이스 연결
    try:
        conn = psycopg2.connect(DATABASE_URL)
        print("✅ 데이터베이스 연결 성공\n")
    except Exception as e:
        print(f"❌ 데이터베이스 연결 실패: {e}")
        sys.exit(1)
    
    # 크롤링할 레스토랑 조회
    restaurants = get_restaurants_to_crawl(conn)
    total = len(restaurants)
    
    if total == 0:
        print("ℹ️  크롤링할 레스토랑이 없습니다.")
        conn.close()
        return
    
    print(f"📋 크롤링 대상: {total}개 레스토랑\n")
    
    # Selenium 드라이버 설정
    try:
        driver = setup_driver()
        print("✅ Chrome WebDriver 설정 완료\n")
    except Exception as e:
        print(f"❌ WebDriver 설정 실패: {e}")
        conn.close()
        sys.exit(1)
    
    # 크롤링 실행
    success_count = 0
    error_count = 0
    
    try:
        for idx, (restaurant_id, hotpepper_id, name, shop_url) in enumerate(restaurants, 1):
            print(f"\n[{idx}/{total}] {name}")
            
            try:
                # 상세 페이지 크롤링
                tel, official_homepage = crawl_restaurant_detail(driver, shop_url)
                
                # 데이터베이스 업데이트
                if tel or official_homepage:
                    update_restaurant(conn, restaurant_id, tel, official_homepage)
                    success_count += 1
                    print(f"    💾 데이터베이스 업데이트 완료")
                else:
                    print(f"    ⚠️  수집된 데이터 없음")
                
            except Exception as e:
                error_count += 1
                print(f"    ❌ 에러 발생: {str(e)}")
            
            # 랜덤 대기 (차단 방지)
            if idx < total:
                wait_time = random.uniform(MIN_WAIT, MAX_WAIT)
                print(f"    ⏳ {wait_time:.1f}초 대기...")
                time.sleep(wait_time)
    
    finally:
        # 정리
        driver.quit()
        conn.close()
    
    # 결과 요약
    print("\n" + "=" * 60)
    print("📊 크롤링 완료!")
    print(f"✅ 성공: {success_count}개")
    print(f"❌ 실패: {error_count}개")
    print("=" * 60)


if __name__ == "__main__":
    main()

