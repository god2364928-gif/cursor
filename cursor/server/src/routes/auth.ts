import { Router, Request, Response } from 'express'
import { pool } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      console.log(`Login attempt: User not found for email: ${email}`)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      console.log(`Login attempt: Invalid password for email: ${email}`)
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    )

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, team: user.team },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    )

    console.log(`Login success: ${email}, name: ${user.name}, role: ${user.role}, team: ${user.team}`)
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        team: user.team,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error', error: String(error) })
  }
})

// DEBUG: Check database status
router.get('/debug/db-status', async (req: Request, res: Response) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users')
    const users = await pool.query('SELECT id, email, name FROM users LIMIT 5')
    res.json({
      status: 'connected',
      userCount: userCount.rows[0].count,
      users: users.rows,
      jwtSecretSet: !!process.env.JWT_SECRET
    })
  } catch (error) {
    console.error('DB status error:', error)
    res.status(500).json({ status: 'error', error: String(error) })
  }
})

// Create user (admin only)
router.post('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { name, email, password, team, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user
    const result = await pool.query(
      'INSERT INTO users (name, email, password, team, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, team, role, created_at',
      [name, email, hashedPassword, team || null, role || 'user']
    )

    res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Error creating user:', error)
    if ((error as any).code === '23505') {
      return res.status(400).json({ message: 'Email already exists' })
    }
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get all users (all authenticated users can access)
router.get('/users', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, team, role, created_at, last_login_at,
              department, position, employment_status, base_salary, hire_date,
              contract_start_date, contract_end_date, mart_id,
              transportation_route, monthly_transportation_cost,
              transportation_start_date, transportation_details
       FROM users ORDER BY created_at DESC`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Update user (admin only)
router.put('/users/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { id } = req.params
    const {
      name,
      email,
      password,
      team,
      role,
      department,
      position,
      employmentStatus,
      baseSalary,
      hireDate,
      contractStartDate,
      contractEndDate,
      martId,
      transportationRoute,
      monthlyTransportationCost,
      transportationStartDate,
      transportationDetails
    } = req.body

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    // Helper function to convert empty strings to null
    const toNullIfEmpty = (value: any): any => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string') {
        const trimmed = value.trim()
        return trimmed || null
      }
      return value
    }

    // If password is provided, hash it
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    // role이 전달되지 않은 경우 기존 값을 유지하기 위해 현재 사용자 정보 조회
    let finalRole = role
    if (role === undefined || role === null) {
      const currentUserResult = await pool.query('SELECT role FROM users WHERE id = $1', [id])
      if (currentUserResult.rows.length > 0) {
        finalRole = currentUserResult.rows[0].role
      } else {
        finalRole = 'user' // 사용자가 없는 경우 기본값
      }
    }

    // Update user
    let result
    if (hashedPassword) {
      result = await pool.query(
        `UPDATE users SET 
          name = $1, email = $2, password = $3, team = $4, role = $5,
          department = $6, position = $7, employment_status = $8, base_salary = $9,
          hire_date = $10, contract_start_date = $11, contract_end_date = $12, mart_id = $13,
          transportation_route = $14, monthly_transportation_cost = $15,
          transportation_start_date = $16, transportation_details = $17
         WHERE id = $18 RETURNING *`,
        [
          name, email, hashedPassword, toNullIfEmpty(team), finalRole,
          toNullIfEmpty(department), toNullIfEmpty(position), toNullIfEmpty(employmentStatus), toNullIfEmpty(baseSalary),
          toNullIfEmpty(hireDate), toNullIfEmpty(contractStartDate), toNullIfEmpty(contractEndDate), toNullIfEmpty(martId),
          toNullIfEmpty(transportationRoute), toNullIfEmpty(monthlyTransportationCost),
          toNullIfEmpty(transportationStartDate), toNullIfEmpty(transportationDetails),
          id
        ]
      )
    } else {
      result = await pool.query(
        `UPDATE users SET 
          name = $1, email = $2, team = $3, role = $4,
          department = $5, position = $6, employment_status = $7, base_salary = $8,
          hire_date = $9, contract_start_date = $10, contract_end_date = $11, mart_id = $12,
          transportation_route = $13, monthly_transportation_cost = $14,
          transportation_start_date = $15, transportation_details = $16
         WHERE id = $17 RETURNING *`,
        [
          name, email, toNullIfEmpty(team), finalRole,
          toNullIfEmpty(department), toNullIfEmpty(position), toNullIfEmpty(employmentStatus), toNullIfEmpty(baseSalary),
          toNullIfEmpty(hireDate), toNullIfEmpty(contractStartDate), toNullIfEmpty(contractEndDate), toNullIfEmpty(martId),
          toNullIfEmpty(transportationRoute), toNullIfEmpty(monthlyTransportationCost),
          toNullIfEmpty(transportationStartDate), toNullIfEmpty(transportationDetails),
          id
        ]
      )
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // accounting_employees 테이블도 동기화 (이름으로 매칭)
    // 기본급이나 고용상태가 변경된 경우 accounting_employees도 업데이트
    try {
      const updatedUser = result.rows[0]
      
      // employment_status를 accounting_employees 형식으로 변환
      let employmentStatusForAccounting = '입사중'
      if (updatedUser.employment_status === '재직') {
        employmentStatusForAccounting = '입사중'
      } else if (updatedUser.employment_status === '퇴사') {
        employmentStatusForAccounting = '퇴사'
      } else if (updatedUser.employment_status === '휴직') {
        employmentStatusForAccounting = '휴직'
      }
      
      // accounting_employees 테이블에 동일한 이름의 직원이 있으면 업데이트
      await pool.query(
        `UPDATE accounting_employees
         SET base_salary = $1, 
             employment_status = $2,
             updated_at = NOW()
         WHERE name = $3`,
        [
          toNullIfEmpty(baseSalary) || 0,
          employmentStatusForAccounting,
          name
        ]
      )
      
      console.log(`[직원 동기화] ${name}의 기본급을 accounting_employees 테이블에 반영했습니다 (${toNullIfEmpty(baseSalary) || 0})`)
    } catch (syncError) {
      // accounting_employees 동기화 실패는 로그만 남기고 사용자 업데이트는 성공으로 처리
      console.error('Error syncing to accounting_employees:', syncError)
    }

    res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Error updating user:', error)
    if ((error as any).code === '23505') {
      return res.status(400).json({ message: 'Email already exists' })
    }
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Delete user (admin only)
router.delete('/users/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { id } = req.params

    // Don't allow deleting yourself
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Cannot delete your own account' })
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Change own password
router.put('/change-password', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' })
    }
    
    // Get current user from database
    const userResult = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user?.id]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }
    
    const user = userResult.rows[0]
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid current password' })
    }
    
    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    
    // Update password
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedNewPassword, req.user?.id]
    )
    
    res.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Error changing password:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Bulk change manager name across all tables (admin only)
router.post('/bulk-change-manager', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
    }

    const { oldManager, newManager } = req.body

    if (!oldManager || !newManager) {
      return res.status(400).json({ message: 'Both oldManager and newManager are required' })
    }

    // First, get counts of records that will be affected
    const customersCount = await pool.query(
      'SELECT COUNT(*) as count FROM customers WHERE manager = $1',
      [oldManager]
    )
    const retargetingCount = await pool.query(
      'SELECT COUNT(*) as count FROM retargeting_customers WHERE manager = $1',
      [oldManager]
    )
    const salesTrackingCount = await pool.query(
      'SELECT COUNT(*) as count FROM sales_tracking WHERE manager_name = $1',
      [oldManager]
    )

    // Update all tables
    await pool.query(
      'UPDATE customers SET manager = $1 WHERE manager = $2',
      [newManager, oldManager]
    )
    
    await pool.query(
      'UPDATE retargeting_customers SET manager = $1 WHERE manager = $2',
      [newManager, oldManager]
    )
    
    await pool.query(
      'UPDATE sales_tracking SET manager_name = $1 WHERE manager_name = $2',
      [newManager, oldManager]
    )

    res.json({
      success: true,
      message: '담당자 일괄 변경 완료',
      changes: {
        customers: parseInt(customersCount.rows[0].count),
        retargeting: parseInt(retargetingCount.rows[0].count),
        salesTracking: parseInt(salesTrackingCount.rows[0].count)
      }
    })
  } catch (error) {
    console.error('Error bulk changing manager:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
