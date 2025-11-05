import { Router, Response } from 'express'
import { pool } from '../db'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Global search across customers, retargeting, and sales tracking
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const keyword = req.query.q as string || ''
    
    if (!keyword || keyword.trim().length === 0) {
      return res.json([])
    }
    
    const searchTerm = `%${keyword.trim()}%`
    
    // 1. 고객관리 검색 (전화번호 포함)
    const customersResult = await pool.query(`
      SELECT 
        'customers' as page,
        manager as manager_name,
        COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name,
        id
      FROM customers
      WHERE 
        company_name ILIKE $1 OR 
        customer_name ILIKE $1 OR
        instagram ILIKE $1 OR
        phone1 ILIKE $1 OR
        phone2 ILIKE $1 OR
        phone3 ILIKE $1
      LIMIT 10
    `, [searchTerm])
    
    // 2. 리타겟팅 검색 (전화번호 포함)
    const retargetingResult = await pool.query(`
      SELECT 
        'retargeting' as page,
        manager as manager_name,
        COALESCE(company_name || ' - ' || customer_name, customer_name) as display_name,
        id
      FROM retargeting_customers
      WHERE 
        company_name ILIKE $1 OR 
        customer_name ILIKE $1 OR
        instagram ILIKE $1 OR
        phone ILIKE $1 OR
        COALESCE(phone1, '') ILIKE $1 OR
        COALESCE(phone2, '') ILIKE $1 OR
        COALESCE(phone3, '') ILIKE $1
      LIMIT 10
    `, [searchTerm])
    
    // 3. 영업이력 검색 (전화번호 포함)
    const salesTrackingResult = await pool.query(`
      SELECT 
        'salesTracking' as page,
        manager_name,
        COALESCE(customer_name, account_id, '(no name)') as display_name,
        id
      FROM sales_tracking
      WHERE 
        customer_name ILIKE $1 OR 
        account_id ILIKE $1 OR
        phone ILIKE $1 OR
        contact_person ILIKE $1
      LIMIT 10
    `, [searchTerm])
    
    // 결과 병합
    const results = [
      ...customersResult.rows.map(r => ({
        page: 'customers' as const,
        manager: r.manager_name,
        name: r.display_name,
        id: r.id
      })),
      ...retargetingResult.rows.map(r => ({
        page: 'retargeting' as const,
        manager: r.manager_name,
        name: r.display_name,
        id: r.id
      })),
      ...salesTrackingResult.rows.map(r => ({
        page: 'salesTracking' as const,
        manager: r.manager_name,
        name: r.display_name,
        id: r.id
      }))
    ]
    
    res.json(results)
  } catch (error) {
    console.error('Error in global search:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
