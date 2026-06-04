import pg from 'pg'
const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

const r = await pool.query(`
  SELECT id, transaction_date, item_name, amount, bank_name, created_at
  FROM accounting_transactions
  ORDER BY created_at DESC
  LIMIT 20
`)
console.log(`Latest 20 rows (ALL banks):`)
console.table(r.rows.map(row => ({
  id: row.id.slice(0,8),
  date: row.transaction_date.toISOString().slice(0,10),
  name: row.item_name || '(empty)',
  amount: '¥' + Number(row.amount).toLocaleString(),
  bank: row.bank_name || '-',
  created: new Date(row.created_at).toISOString().replace('T',' ').slice(0,19)
})))

const r2 = await pool.query(`
  SELECT DISTINCT bank_name, COUNT(*) as cnt
  FROM accounting_transactions
  GROUP BY bank_name
  ORDER BY cnt DESC
`)
console.log('\nBank name distribution:')
console.table(r2.rows)

await pool.end()
