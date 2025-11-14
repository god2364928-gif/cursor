const token = 'LhLHHQ4r8fK14tF4VXvI93xYAocmdjO08B5gfCmceNw';

async function testFreeeAPI() {
  try {
    console.log('🔍 Testing freee API...');
    const response = await fetch('https://api.freee.co.jp/api/1/companies', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const text = await response.text();
    console.log('Response length:', text.length);
    console.log('Response:', text.substring(0, 500));
    
    if (response.ok) {
      const data = JSON.parse(text);
      console.log('✅ Companies count:', data.companies?.length || 0);
      if (data.companies && data.companies.length > 0) {
        console.log('First company:', JSON.stringify(data.companies[0], null, 2));
      }
    } else {
      console.log('❌ Error response');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  }
}

testFreeeAPI();
