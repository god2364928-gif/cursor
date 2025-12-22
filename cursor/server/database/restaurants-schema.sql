-- =============================
-- 일본 음식점 CRM 스키마
-- 67만개 데이터를 효율적으로 조회하기 위한 테이블 및 인덱스
-- =============================

-- Enable UUID extension (이미 있으면 무시)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================
-- restaurants 테이블 (음식점 마스터)
-- =============================
CREATE TABLE IF NOT EXISTS restaurants (
  id SERIAL PRIMARY KEY,
  shop_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  tel_original VARCHAR(50),
  tel_confirmed VARCHAR(50),
  address TEXT,
  prefecture VARCHAR(50) NOT NULL,
  areas TEXT[],
  genres TEXT[],
  homepage TEXT,
  homepage_status VARCHAR(50),
  instagram TEXT,
  hotpepper TEXT,
  is_contactable BOOLEAN DEFAULT FALSE,
  
  -- 쓸 수 없는 가게 표시
  is_unusable BOOLEAN DEFAULT FALSE,
  unusable_reason TEXT,
  unusable_by UUID REFERENCES users(id) ON DELETE SET NULL,
  unusable_at TIMESTAMP,
  
  -- 영업 상태 관리
  status VARCHAR(50) DEFAULT 'new', -- new, contacted, contracted, rejected
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMP,
  last_contacted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- 메모
  memo TEXT,
  
  -- 타임스탬프
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- sales_activities 테이블 (영업 이력)
-- =============================
CREATE TABLE IF NOT EXISTS sales_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name VARCHAR(100) NOT NULL,
  contact_method VARCHAR(20) NOT NULL, -- 'form', 'phone', 'instagram', 'line'
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================
-- 성능 인덱스 (67만개 데이터 최적화)
-- =============================

-- 1. B-Tree 인덱스: 정확 일치 검색용
CREATE INDEX IF NOT EXISTS idx_restaurants_prefecture ON restaurants(prefecture);
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_unusable ON restaurants(is_unusable);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_contactable ON restaurants(is_contactable);
CREATE INDEX IF NOT EXISTS idx_restaurants_assignee ON restaurants(assignee_id);

-- 2. GIN 인덱스: 배열 검색용 (지역, 장르)
CREATE INDEX IF NOT EXISTS idx_restaurants_areas ON restaurants USING GIN(areas);
CREATE INDEX IF NOT EXISTS idx_restaurants_genres ON restaurants USING GIN(genres);

-- 3. 부분 인덱스: 전화번호/홈페이지/인스타그램 존재 여부 필터링
CREATE INDEX IF NOT EXISTS idx_restaurants_has_tel_original 
  ON restaurants(id) 
  WHERE tel_original IS NOT NULL AND tel_original != '';

CREATE INDEX IF NOT EXISTS idx_restaurants_has_homepage 
  ON restaurants(id) 
  WHERE homepage IS NOT NULL AND homepage != '';

CREATE INDEX IF NOT EXISTS idx_restaurants_has_instagram 
  ON restaurants(id) 
  WHERE instagram IS NOT NULL AND instagram != '';

CREATE INDEX IF NOT EXISTS idx_restaurants_contactable 
  ON restaurants(id) 
  WHERE is_contactable = true;

-- 4. 복합 인덱스: 주요 필터 조합
CREATE INDEX IF NOT EXISTS idx_restaurants_prefecture_status 
  ON restaurants(prefecture, status) 
  WHERE is_unusable = false;

CREATE INDEX IF NOT EXISTS idx_restaurants_prefecture_contactable 
  ON restaurants(prefecture, is_contactable) 
  WHERE is_unusable = false;

-- 5. 텍스트 검색용 인덱스
CREATE INDEX IF NOT EXISTS idx_restaurants_name_trgm 
  ON restaurants USING GIN(name gin_trgm_ops);

-- trigram 확장 (이미 있으면 무시)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 6. 영업 이력 인덱스
CREATE INDEX IF NOT EXISTS idx_sales_activities_restaurant 
  ON sales_activities(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_user 
  ON sales_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_created 
  ON sales_activities(created_at DESC);

-- =============================
-- 업데이트 트리거
-- =============================
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_restaurants_updated_at ON restaurants;
CREATE TRIGGER trigger_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurants_updated_at();









