-- HotPepper Gourmet restaurants table
CREATE TABLE IF NOT EXISTS hotpepper_restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotpepper_id VARCHAR(50) UNIQUE NOT NULL,  -- HotPepper's shop ID
  name VARCHAR(255) NOT NULL,                 -- 가게명
  tel VARCHAR(50),                            -- 전화번호
  address TEXT,                               -- 주소
  budget_average VARCHAR(100),                -- 평균 예산
  catch_phrase TEXT,                          -- 가게 홍보 문구
  shop_url TEXT,                              -- 가게 상세 URL
  search_keyword VARCHAR(255),                -- 검색에 사용된 키워드
  search_area VARCHAR(100),                   -- 검색에 사용된 지역
  collected_by UUID REFERENCES users(id),     -- 수집한 사용자
  collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,                                 -- 메모
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster searches
CREATE INDEX IF NOT EXISTS idx_hotpepper_restaurants_name ON hotpepper_restaurants(name);
CREATE INDEX IF NOT EXISTS idx_hotpepper_restaurants_area ON hotpepper_restaurants(search_area);
CREATE INDEX IF NOT EXISTS idx_hotpepper_restaurants_keyword ON hotpepper_restaurants(search_keyword);
CREATE INDEX IF NOT EXISTS idx_hotpepper_restaurants_collected_at ON hotpepper_restaurants(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotpepper_restaurants_deleted ON hotpepper_restaurants(is_deleted);

