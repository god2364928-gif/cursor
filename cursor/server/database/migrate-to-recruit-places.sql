-- 기존 hotpepper_restaurants를 recruit_places로 확장
-- API 타입 필드 및 추가 정보 필드 추가

-- 1. 새 테이블 생성
CREATE TABLE IF NOT EXISTS recruit_places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruit_id VARCHAR(50) NOT NULL,           -- API별 고유 ID
  api_type VARCHAR(20) NOT NULL,             -- 'gourmet', 'beauty', 'hotel', 'golf'
  name VARCHAR(255) NOT NULL,                -- 장소명
  tel VARCHAR(50),                           -- 전화번호
  address TEXT,                              -- 주소
  latitude DECIMAL(10, 7),                   -- 위도
  longitude DECIMAL(10, 7),                  -- 경도
  
  -- 분류 정보
  genre VARCHAR(100),                        -- 장르/업종
  category VARCHAR(100),                     -- 세부 카테고리
  
  -- 가격 정보
  budget_average VARCHAR(100),               -- 평균 예산/가격
  
  -- 홍보 정보
  catch_phrase TEXT,                         -- 캐치프레이즈
  shop_url TEXT,                             -- 상세 페이지 URL
  image_url TEXT,                            -- 대표 이미지 URL
  
  -- 운영 정보
  business_hours TEXT,                       -- 영업시간
  holiday TEXT,                              -- 정기 휴일
  parking VARCHAR(255),                      -- 주차 정보
  capacity INTEGER,                          -- 수용 인원/좌석 수
  card_accepted VARCHAR(100),                -- 카드 결제 가능 여부
  
  -- 검색 메타데이터
  search_keyword VARCHAR(255),               -- 검색에 사용된 키워드
  search_area VARCHAR(100),                  -- 검색에 사용된 지역
  
  -- 관리 정보
  collected_by UUID REFERENCES users(id),    -- 수집한 사용자
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,                                -- 메모
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- 중복 방지 (API 타입별 고유 ID)
  UNIQUE(api_type, recruit_id)
);

-- 2. 기존 데이터 마이그레이션 (hotpepper_restaurants가 있으면)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'hotpepper_restaurants'
  ) THEN
    -- 기존 데이터를 새 테이블로 복사
    INSERT INTO recruit_places (
      recruit_id, api_type, name, tel, address,
      budget_average, catch_phrase, shop_url,
      search_keyword, search_area,
      collected_by, collected_at, notes, is_deleted,
      created_at, updated_at
    )
    SELECT 
      hotpepper_id,
      'gourmet',  -- 모든 기존 데이터는 gourmet 타입
      name,
      tel,
      address,
      budget_average,
      catch_phrase,
      shop_url,
      search_keyword,
      search_area,
      collected_by,
      collected_at,
      notes,
      is_deleted,
      created_at,
      updated_at
    FROM hotpepper_restaurants
    ON CONFLICT (api_type, recruit_id) DO NOTHING;
    
    RAISE NOTICE '기존 hotpepper_restaurants 데이터가 recruit_places로 마이그레이션되었습니다';
  END IF;
END $$;

-- 3. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_recruit_places_api_type ON recruit_places(api_type);
CREATE INDEX IF NOT EXISTS idx_recruit_places_name ON recruit_places(name);
CREATE INDEX IF NOT EXISTS idx_recruit_places_area ON recruit_places(search_area);
CREATE INDEX IF NOT EXISTS idx_recruit_places_keyword ON recruit_places(search_keyword);
CREATE INDEX IF NOT EXISTS idx_recruit_places_collected_at ON recruit_places(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_recruit_places_deleted ON recruit_places(is_deleted);
CREATE INDEX IF NOT EXISTS idx_recruit_places_location ON recruit_places(latitude, longitude);

-- 4. 기존 테이블 백업 후 삭제는 수동으로 (안전을 위해)
-- DROP TABLE IF EXISTS hotpepper_restaurants;

