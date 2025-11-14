import https from 'https';

const token = 'LhLHHQ4r8fK14tF4VXvI93xYAocmdjO08B5gfCmceNw';

const options = {
  hostname: 'api.freee.co.jp',
  path: '/api/1/companies',
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
};

console.log('🔍 Testing freee API with native https...');

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse body:');
    console.log(data);
    
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        console.log('\n✅ Parsed JSON:');
        console.log(JSON.stringify(json, null, 2));
        console.log('\n📊 Companies count:', json.companies?.length || 0);
      } catch (e) {
        console.log('❌ Failed to parse JSON:', e.message);
      }
    } else {
      console.log('❌ Error status code');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.end();

