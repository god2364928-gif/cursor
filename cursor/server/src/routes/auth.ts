import { Router, Request, Response } from 'express'
import { pool } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { EMPLOYMENT_STATUS_ACTIVE } from '../lib/employment'

const router = Router()

const CRM_ACCESS_ROLES = new Set(['manager', 'marketer', 'office_assistant'])

/** 빈 문자열은 NULL 로 저장한다 (날짜/숫자 컬럼에 '' 이 들어가면 캐스팅 에러) */
function toNullIfEmpty(value: any): any {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || null
  }
  return value
}

function defaultAppAccessForRole(role: string | undefined | null): string {
  if (role === 'admin') return 'admin,crm,erp'
  if (role && CRM_ACCESS_ROLES.has(role)) return 'crm,erp'
  return 'erp'
}

function parseAppAccess(appAccess: string | undefined | null): string[] {
  return (appAccess || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function ensureRoleAppAccess(role: string | undefined | null, appAccess: string | undefined | null): string {
  const parts = parseAppAccess(appAccess)
  if (parts.length === 0) {
    return defaultAppAccessForRole(role)
  }

  if (role === 'admin') {
    for (const area of ['admin', 'crm', 'erp']) {
      if (!parts.includes(area)) parts.push(area)
    }
    return parts.join(',')
  }

  if (role && CRM_ACCESS_ROLES.has(role) && !parts.includes('crm')) {
    parts.unshift('crm')
  }

  return parts.join(',')
}

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

    // app_access 기본값 보정 (마이그레이션 이전 사용자 및 신규 CRM 역할 대응)
    const appAccess = ensureRoleAppAccess(user.role, user.app_access)
    if (appAccess !== user.app_access) {
      try {
        await pool.query('UPDATE users SET app_access = $1 WHERE id = $2', [appAccess, user.id])
        console.log(`[auto-fix] ${user.role} ${email} app_access -> ${appAccess}`)
      } catch (e) {
        console.error('[auto-fix] failed to persist app_access:', e)
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        team: user.team,
        app_access: appAccess,
      },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    )

    console.log(`Login success: ${email}, name: ${user.name}, role: ${user.role}, team: ${user.team}, access: ${appAccess}`)
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        team: user.team,
        role: user.role,
        app_access: appAccess,
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

    const { name, email, password, team, role, employmentStatus, hireDate, department, position } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)
    const finalRole = role || 'user'
    const appAccess = defaultAppAccessForRole(finalRole)

    // employment_status 는 컬럼 DEFAULT 가 없어, 넘어오지 않으면 NULL 로 저장된다.
    // NULL 계정은 어드민 화면에서는 '입사중' 처럼 보이지만 재직 판정 쿼리에서는 탈락해
    // 담당자 목록·급여·연차에서 조용히 사라진다 → 반드시 표준값으로 채운다.
    const finalEmploymentStatus = toNullIfEmpty(employmentStatus) || EMPLOYMENT_STATUS_ACTIVE

    // Insert user
    // hire_date 는 연차 자동부여·건강검진 자격 판정의 기준이므로 생성 시점에 함께 받는다.
    const result = await pool.query(
      `INSERT INTO users (name, email, password, team, role, app_access,
                          employment_status, hire_date, department, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, team, role, app_access,
                 employment_status, hire_date, department, position, created_at`,
      [
        name, email, hashedPassword, toNullIfEmpty(team), finalRole, appAccess,
        finalEmploymentStatus, toNullIfEmpty(hireDate), toNullIfEmpty(department), toNullIfEmpty(position)
      ]
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
              app_access, department, position, employment_status, base_salary, hire_date,
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
    const { name, email, password, role } = req.body

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' })
    }

    // If password is provided, hash it
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10)
    }

    // role이 전달되지 않은 경우 기존 값을 유지하기 위해 현재 사용자 정보 조회
    let finalRole = role
    const currentUserResult = await pool.query('SELECT role, app_access FROM users WHERE id = $1', [id])
    const currentUser = currentUserResult.rows[0]
    if (role === undefined || role === null) {
      finalRole = currentUser?.role || 'user'
    }
    const finalAppAccess = ensureRoleAppAccess(finalRole, currentUser?.app_access)

    // ⚠️ 부분 업데이트 (요청 본문에 있는 필드만 UPDATE).
    //
    // 과거에는 17개 컬럼을 무조건 전부 덮어쓰는 full-replace UPDATE 였다. 그런데 어드민
    // 회원관리 폼(AdminPage)은 name/email/password/role/employmentStatus 5개만 전송하므로,
    // 역할만 바꿔 저장해도 department·position·base_salary·hire_date·계약일·교통비가
    // 전부 NULL 로 지워졌다. hire_date 가 지워지면 연차 자동부여 대상에서도 빠져
    // 조용히 연차가 미부여되는 2차 피해까지 발생했다.
    // → 이제 본문에 키가 존재하는 필드만 건드린다.
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    const pushUpdate = (column: string, value: any) => {
      updates.push(`${column} = $${paramIndex++}`)
      params.push(value)
    }

    // 요청 본문 키 → 컬럼 매핑. 여기에 없는 컬럼은 이 API 로 수정할 수 없다.
    const OPTIONAL_FIELDS: Array<[string, string]> = [
      ['team', 'team'],
      ['department', 'department'],
      ['position', 'position'],
      ['employmentStatus', 'employment_status'],
      ['baseSalary', 'base_salary'],
      ['hireDate', 'hire_date'],
      ['contractStartDate', 'contract_start_date'],
      ['contractEndDate', 'contract_end_date'],
      ['martId', 'mart_id'],
      ['transportationRoute', 'transportation_route'],
      ['monthlyTransportationCost', 'monthly_transportation_cost'],
      ['transportationStartDate', 'transportation_start_date'],
      ['transportationDetails', 'transportation_details'],
    ]

    pushUpdate('name', name)
    pushUpdate('email', email)
    if (hashedPassword) pushUpdate('password', hashedPassword)
    pushUpdate('role', finalRole)
    pushUpdate('app_access', finalAppAccess)

    for (const [bodyKey, column] of OPTIONAL_FIELDS) {
      if (!(bodyKey in req.body)) continue
      pushUpdate(column, toNullIfEmpty(req.body[bodyKey]))
    }

    params.push(id)
    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // accounting_employees 테이블도 동기화 (이름으로 매칭)
    //
    // 값은 요청 본문이 아니라 UPDATE 의 RETURNING 결과에서 읽는다. 부분 업데이트가 되면서
    // 본문에 baseSalary 가 없는 요청(예: 역할만 변경)도 정상 케이스가 됐는데, 예전처럼
    // `baseSalary || 0` 을 쓰면 그런 요청마다 경리 기본급이 0 으로 덮어써진다.
    //
    // employment_status 는 변환 없이 그대로 넘긴다. 기존 변환 로직은 '재직' → '입사중' 을
    // 기대했지만 실제 UI 가 저장하는 값은 '입사중'/'입사전'/'퇴사' 라 변환이 무의미했고,
    // 오히려 '입사전' 을 '입사중' 으로 바꿔 넣는 부작용이 있었다.
    try {
      const updatedUser = result.rows[0]

      const sync = await pool.query(
        `UPDATE accounting_employees
         SET base_salary = $1,
             employment_status = $2,
             updated_at = NOW()
         WHERE name = $3`,
        [
          updatedUser.base_salary ?? 0,
          updatedUser.employment_status ?? EMPLOYMENT_STATUS_ACTIVE,
          updatedUser.name
        ]
      )

      // 두 테이블은 이름으로만 연결돼 있어, 경리 직원 등록이 안 된 사람이나 이름이 바뀐
      // 사람은 조용히 0건 업데이트로 끝난다. 무음 실패를 남기지 않도록 경고를 찍는다.
      // (accounting_employees 는 급여대장·거래가 FK 로 참조하는 회계 테이블이라
      //  여기서 임의로 행을 생성하지 않는다 — 경리 직원관리 화면에서 등록해야 한다.)
      if (sync.rowCount === 0) {
        console.warn(`[직원 동기화] accounting_employees 에 '${updatedUser.name}' 행이 없어 반영하지 못했습니다 (경리 직원관리에서 등록 필요)`)
      } else {
        console.log(`[직원 동기화] ${updatedUser.name} → accounting_employees 반영 (기본급 ${updatedUser.base_salary ?? 0}, 상태 ${updatedUser.employment_status ?? EMPLOYMENT_STATUS_ACTIVE})`)
      }
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
