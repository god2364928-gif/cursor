const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

const CREDENTIALS_PATH = './gmail-credentials.json';
const TOKEN_PATH = './gmail-token.json';
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];

async function authenticate() {
  console.log('📧 Gmail API 인증 시작...\n');

  // 인증 파일 확인
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.error('❌ gmail-credentials.json 파일을 찾을 수 없습니다.');
    console.error('   파일 위치:', CREDENTIALS_PATH);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🔐 다음 URL을 브라우저에서 열어주세요:\n');
  console.log(authUrl);
  console.log('\n인증 후 받은 코드를 아래에 입력하세요:');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('인증 코드: ', async (code) => {
    rl.close();
    
    try {
      const { tokens } = await oAuth2Client.getToken(code);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
      console.log('\n✅ 인증 완료! gmail-token.json 파일이 생성되었습니다.');
      console.log('📧 Gmail: cocomarke.official@gmail.com');
      console.log('🔑 토큰 저장 위치:', TOKEN_PATH);
      console.log('\n이제 서버를 시작하면 자동으로 입금 메일을 체크합니다!');
    } catch (error) {
      console.error('\n❌ 인증 실패:', error.message);
      console.error('   다시 시도해주세요.');
    }
  });
}

authenticate();
