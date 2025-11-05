// Railway에서 실행되는 실제 코드 확인용
const fs = require('fs');
const path = require('path');

const globalSearchPath = path.join(__dirname, 'dist/routes/globalSearch.js');

if (fs.existsSync(globalSearchPath)) {
  const content = fs.readFileSync(globalSearchPath, 'utf8');
  const retargetingMatch = content.match(/retargeting_customers[\s\S]{0,200}LIMIT 10/);
  
  console.log('=== Railway 배포 파일 확인 ===');
  console.log('retargeting_customers 쿼리 부분:');
  console.log(retargetingMatch ? retargetingMatch[0] : 'NOT FOUND');
  
  if (content.includes('phone1') && content.includes('retargeting_customers')) {
    console.log('\n❌ 오류: phone1이 여전히 사용되고 있습니다!');
  } else {
    console.log('\n✅ OK: phone만 사용하고 있습니다.');
  }
} else {
  console.log('❌ dist/routes/globalSearch.js 파일이 없습니다!');
}

