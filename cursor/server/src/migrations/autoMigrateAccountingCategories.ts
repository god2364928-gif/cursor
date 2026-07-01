import { pool } from '../db'

/**
 * 회계 거래 카테고리 관리 테이블 (accounting_categories)
 * - 기존에 프론트 constants.ts 에 하드코딩되어 있던 카테고리를 DB 로 전환
 * - value: 거래(accounting_transactions.category)에 저장되는 문자열 키 (한국어 기준, 불변)
 * - label_ja / label_ko: 화면 표시용 라벨 (수정 가능)
 * - is_default: 시스템 기본 제공 카테고리 여부
 * - is_system: 삭제 불가(예: 지정없음 — 폼 기본값/센티넬)
 * 멱등: 매번 실행되어도 OK (테이블/기본값 존재 시 skip)
 */

// 프론트 CATEGORY_OPTIONS 와 동일한 기본 카테고리 (순서 유지)
const DEFAULT_CATEGORIES: Array<{ value: string; labelJa: string; labelKo: string; isSystem?: boolean }> = [
  { value: '지정없음', labelJa: '指定なし', labelKo: '지정없음', isSystem: true },
  { value: '셀마플', labelJa: 'セルマプ', labelKo: '셀마플' },
  { value: '코코마케', labelJa: 'ココマケ', labelKo: '코코마케' },
  { value: '운영비', labelJa: '運営費', labelKo: '운영비' },
  { value: '급여', labelJa: '給与', labelKo: '급여' },
  { value: '월세', labelJa: '家賃', labelKo: '월세' },
  { value: '세금', labelJa: '税金', labelKo: '세금' },
  { value: '기타', labelJa: 'その他', labelKo: '기타' },
]

export async function autoMigrateAccountingCategories(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounting_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        value VARCHAR(50) NOT NULL UNIQUE,
        label_ja VARCHAR(100) NOT NULL,
        label_ko VARCHAR(100) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_system BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_accounting_categories_sort ON accounting_categories(sort_order);`
    )

    // 기본 카테고리 seed (이미 있으면 값 유지, 없으면 삽입)
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const c = DEFAULT_CATEGORIES[i]
      await pool.query(
        `INSERT INTO accounting_categories (value, label_ja, label_ko, sort_order, is_default, is_system)
         VALUES ($1, $2, $3, $4, true, $5)
         ON CONFLICT (value) DO NOTHING`,
        [c.value, c.labelJa, c.labelKo, i, c.isSystem === true]
      )
    }

    console.log('✅ accounting_categories table ensured & default categories seeded')
  } catch (error: any) {
    console.error('❌ accounting_categories auto-migration failed:', error.message)
    console.error('Server will continue to start, but category management may not work')
  }
}
