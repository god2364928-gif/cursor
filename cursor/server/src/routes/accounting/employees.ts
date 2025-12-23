import { Router, Response } from 'express'
import { pool } from '../../db'
import { authMiddleware, AuthRequest } from '../../middleware/auth'
import { adminOnly } from '../../middleware/adminOnly'
import multer from 'multer'
import { decodeFileName } from '../../utils/fileHelper'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.get('/employees', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, name, email, role, team,
        department, position, employment_status,
        base_salary, contract_start_date, contract_end_date,
        mart_id, transportation_route, monthly_transportation_cost,
        transportation_start_date, transportation_details,
        hire_date, created_at, updated_at
       FROM users 
       WHERE employment_status IS NOT NULL
       ORDER BY employment_status, hire_date`
    )
    
    res.json(result.rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      team: r.team,
      department: r.department,
      position: r.position,
      employmentStatus: r.employment_status,
      employment_status: r.employment_status,
      baseSalary: Number(r.base_salary) || 0,
      base_salary: Number(r.base_salary) || 0,
      hireDate: r.hire_date,
      hire_date: r.hire_date,
      contractStartDate: r.contract_start_date,
      contract_start_date: r.contract_start_date,
      contractEndDate: r.contract_end_date,
      contract_end_date: r.contract_end_date,
      martId: r.mart_id,
      mart_id: r.mart_id,
      transportationRoute: r.transportation_route,
      transportation_route: r.transportation_route,
      monthlyTransportationCost: Number(r.monthly_transportation_cost) || 0,
      monthly_transportation_cost: Number(r.monthly_transportation_cost) || 0,
      transportationStartDate: r.transportation_start_date,
      transportation_start_date: r.transportation_start_date,
      transportationDetails: r.transportation_details,
      transportation_details: r.transportation_details,
      createdAt: r.created_at,
    })))
  } catch (error) {
    console.error('Employees fetch error:', error)
    res.status(500).json({ error: '직원 목록을 불러오지 못했습니다' })
  }
})

router.post('/employees', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { name, position, hireDate, baseSalary, incentiveRate } = req.body
    
    const result = await pool.query(
      `INSERT INTO accounting_employees (name, position, hire_date, base_salary, incentive_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, position, hireDate, baseSalary || 0, incentiveRate || 0]
    )
    
    res.json({ success: true, employee: result.rows[0] })
  } catch (error) {
    console.error('Employee create error:', error)
    res.status(500).json({ error: '직원 추가에 실패했습니다' })
  }
})

router.put('/employees/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, position, hireDate, baseSalary, incentiveRate, employmentStatus } = req.body
    
    const result = await pool.query(
      `UPDATE accounting_employees
       SET name = $1, position = $2, hire_date = $3, base_salary = $4, incentive_rate = $5, employment_status = $6, updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, position, hireDate, baseSalary, incentiveRate, employmentStatus, id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: '직원을 찾을 수 없습니다' })
    }
    
    res.json({ success: true, employee: result.rows[0] })
  } catch (error) {
    console.error('Employee update error:', error)
    res.status(500).json({ error: '직원 정보 수정에 실패했습니다' })
  }
})

router.delete('/employees/:id', authMiddleware, adminOnly, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    await pool.query(`DELETE FROM accounting_employees WHERE id = $1`, [id])
    res.json({ success: true })
  } catch (error) {
    console.error('Employee delete error:', error)
    res.status(500).json({ error: '직원 삭제에 실패했습니다' })
  }
})

// ========== 급여 (Payroll) ==========

router.post('/employees/:userId/files', authMiddleware, adminOnly, upload.single('file'), 
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: '파일이 없습니다' })
      }

      const { userId } = req.params
      const { fileCategory, fileSubcategory, yearMonth } = req.body

      // 사용자 존재 확인
      const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [userId])
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: '사용자를 찾을 수 없습니다' })
      }

      // Convert file buffer to Base64
      const fileDataBase64 = req.file.buffer.toString('base64')
      const decodedFileName = decodeFileName(req.file.originalname)

      // Insert file into database
      const result = await pool.query(
        `INSERT INTO user_files (
          user_id, uploaded_by_user_id, file_category, file_subcategory, year_month,
          file_name, original_name, file_type, file_size, file_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, user_id, uploaded_by_user_id, file_category, file_subcategory, 
                  year_month, file_name, original_name, file_type, file_size, created_at`,
        [
          userId,
          req.user?.id,
          fileCategory,
          fileSubcategory || null,
          yearMonth || null,
          decodedFileName,
          decodedFileName,
          req.file.mimetype || 'application/octet-stream',
          req.file.size,
          fileDataBase64
        ]
      )

      const file = result.rows[0]
      res.json({
        id: file.id,
        userId: file.user_id,
        uploadedByUserId: file.uploaded_by_user_id,
        fileCategory: file.file_category,
        fileSubcategory: file.file_subcategory,
        yearMonth: file.year_month,
        fileName: file.file_name,
        originalName: file.original_name,
        fileType: file.file_type,
        fileSize: file.file_size,
        createdAt: file.created_at
      })
    } catch (error) {
      console.error('File upload error:', error)
      res.status(500).json({ error: '파일 업로드에 실패했습니다' })
    }
  }
)

// GET /employees/:userId/files - 파일 목록 조회
router.get('/employees/:userId/files', authMiddleware, adminOnly, 
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.params

      const result = await pool.query(
        `SELECT id, user_id, uploaded_by_user_id, file_category, file_subcategory, year_month,
                file_name, original_name, file_type, file_size, created_at
         FROM user_files
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      )

      const files = result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        uploadedByUserId: row.uploaded_by_user_id,
        fileCategory: row.file_category,
        fileSubcategory: row.file_subcategory,
        yearMonth: row.year_month,
        fileName: row.file_name,
        originalName: row.original_name,
        fileType: row.file_type,
        fileSize: row.file_size,
        createdAt: row.created_at
      }))

      res.json(files)
    } catch (error) {
      console.error('Files fetch error:', error)
      res.status(500).json({ error: '파일 목록 조회에 실패했습니다' })
    }
  }
)

// GET /employees/:userId/files/:fileId - 파일 다운로드
router.get('/employees/:userId/files/:fileId', authMiddleware, adminOnly, 
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId, fileId } = req.params

      const result = await pool.query(
        'SELECT * FROM user_files WHERE id = $1 AND user_id = $2',
        [fileId, userId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: '파일을 찾을 수 없습니다' })
      }

      const file = result.rows[0]
      const fileBuffer = Buffer.from(file.file_data, 'base64')

      res.setHeader('Content-Type', file.file_type)
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`)
      res.send(fileBuffer)
    } catch (error) {
      console.error('File download error:', error)
      res.status(500).json({ error: '파일 다운로드에 실패했습니다' })
    }
  }
)

// DELETE /employees/:userId/files/:fileId - 파일 삭제
router.delete('/employees/:userId/files/:fileId', authMiddleware, adminOnly, 
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId, fileId } = req.params

      const result = await pool.query(
        'DELETE FROM user_files WHERE id = $1 AND user_id = $2 RETURNING id',
        [fileId, userId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: '파일을 찾을 수 없습니다' })
      }

      res.json({ success: true })
    } catch (error) {
      console.error('File delete error:', error)
      res.status(500).json({ error: '파일 삭제에 실패했습니다' })
    }
  }
)

export default router
