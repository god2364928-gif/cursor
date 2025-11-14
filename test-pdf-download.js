// freee API PDF 다운로드 테스트 스크립트
const fetch = require('node-fetch');

// 환경 변수에서 토큰 가져오기 (Railway 환경)
const API_BASE = 'https://cursor-production-1d92.up.railway.app/api';

async function testPdfDownload() {
  try {
    console.log('🔍 Testing PDF download...\n');
    
    // 1. 청구서 목록 조회 (인증 필요)
    console.log('Step 1: Fetching invoice list...');
    const listResponse = await fetch(`${API_BASE}/invoices/list`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // 실제 토큰 필요
      }
    });
    
    if (!listResponse.ok) {
      console.error('❌ Failed to fetch invoice list:', listResponse.status);
      return;
    }
    
    const invoices = await listResponse.json();
    console.log(`✅ Found ${invoices.length} invoices\n`);
    
    if (invoices.length === 0) {
      console.log('No invoices to test');
      return;
    }
    
    // 첫 번째 청구서로 테스트
    const testInvoice = invoices[0];
    console.log('Step 2: Testing PDF download for invoice:', {
      id: testInvoice.id,
      freee_invoice_id: testInvoice.freee_invoice_id,
      partner_name: testInvoice.partner_name
    });
    
    // 2. PDF 다운로드 시도
    const pdfResponse = await fetch(`${API_BASE}/invoices/${testInvoice.id}/pdf`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // 실제 토큰 필요
      }
    });
    
    console.log(`\n📡 PDF Response Status: ${pdfResponse.status}`);
    console.log('📡 Response Headers:', Object.fromEntries(pdfResponse.headers.entries()));
    
    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error(`\n❌ PDF download failed: ${pdfResponse.status}`);
      console.error('Error details:', errorText);
      return;
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log(`\n✅ PDF downloaded successfully: ${pdfBuffer.byteLength} bytes`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// 실행
testPdfDownload();
