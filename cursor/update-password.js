const { Client } = require('pg');

async function updatePassword() {
  const client = new Client({
    connectionString: 'postgresql://postgres:tsFzikkSDWQYOxvVmJBnPUsXYwLApQhI@nozomi.proxy.rlwy.net:53548/railway',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Railway');

    const newHash = '$2a$10$I.to3PC3xF76zmwhe7e3DO.oHwl9qkbE2JM9lCw3CkRSMe..1M0fG';
    
    const result = await client.query(
      'UPDATE users SET password = $1 WHERE email = $2 OR email = $3',
      [newHash, 'hong@example.com', 'admin@test.com']
    );
    
    console.log('✅ Updated', result.rowCount, 'users');
    
    const check = await client.query('SELECT email, password FROM users WHERE email IN ($1, $2)', ['hong@example.com', 'admin@test.com']);
    console.log('\nUpdated users:');
    check.rows.forEach(u => {
      console.log(`- ${u.email}: ${u.password.substring(0, 30)}...`);
    });
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

updatePassword();
