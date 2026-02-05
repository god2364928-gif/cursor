import { toPng } from 'html-to-image'
import jsPDF from 'jspdf'
import api from '../lib/api'

const IMAGE_PREFIX = 'data:image/jpeg;base64,'

interface PdfExportOptions {
  accountId: string
  companyName?: string
  date?: string
  language?: string
}

export async function exportReportToPdf({ accountId, companyName, date, language = 'ko' }: PdfExportOptions) {
  const currentDate = date || new Date().toISOString().split('T')[0]
  const company = companyName || (language === 'ja' ? '会社名' : '회사명')
  const analysisText = language === 'ja' ? 'アカウント分析' : '계정분석'
  const filename = `${company}_@${accountId}_${analysisText}_${currentDate}.pdf`

  // 원본 리포트 컨테이너 찾기
  const originalElement = document.getElementById('report-root')
  if (!originalElement) {
    throw new Error('리포트를 찾을 수 없습니다.')
  }

  console.log('[PDF Export] Starting PDF export...')

  try {
    // 1단계: 모든 외부 이미지를 백엔드 API로 Base64 변환
    const images = originalElement.querySelectorAll('img')
    const imagePromises = Array.from(images).map(async (img) => {
      // 이미 Base64이거나 로컬 이미지는 스킵
      if (
        img.src.startsWith('data:') ||
        img.src.startsWith('blob:') ||
        img.src.includes(window.location.origin)
      ) {
        return
      }

      try {
        console.log('[PDF Export] Converting image:', img.src)
        // 백엔드 API로 Base64 변환 (CORS 우회!)
        const response = await api.post('/convert-image-to-base64', {
          imageUrl: img.src,
        })
        
        if (response.data.status === 'success' && response.data.data) {
          // eslint-disable-next-line no-param-reassign
          img.src = response.data.data
          console.log('[PDF Export] Image converted successfully')
        }
      } catch (error) {
        console.warn('[PDF Export] 이미지 변환 실패:', img.src, error)
        // 실패해도 계속 진행 (원본 이미지 유지)
      }
    })

    // 모든 이미지 변환 완료 대기
    await Promise.all(imagePromises)

    // 짧은 대기 시간으로 이미지 적용 보장
    await new Promise((resolve) => {
      setTimeout(resolve, 300)
    })

    console.log('[PDF Export] Converting to PNG...')

    // 2단계: html-to-image로 PNG 생성
    const dataUrl = await toPng(originalElement, {
      quality: 0.95,
      pixelRatio: 2, // 고해상도
      backgroundColor: '#f2f4f6',
      cacheBust: true,
    })

    console.log('[PDF Export] PNG generated, creating PDF...')

    // 이미지 크기 계산
    const img = new Image()
    img.src = dataUrl

    await new Promise((resolve) => {
      img.onload = resolve
    })

    const pdfWidth = 210 // A4 width in mm
    const pdfHeight = (img.height * pdfWidth) / img.width // 원본 비율 유지

    // 3단계: PDF 생성
    // eslint-disable-next-line new-cap
    const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight])

    // 여백 없이 전체 이미지 삽입
    pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight)

    console.log('[PDF Export] Saving PDF...')

    // PDF 저장
    pdf.save(filename)

    console.log('[PDF Export] PDF saved successfully:', filename)
  } catch (error) {
    console.error('[PDF Export] PDF 생성 에러:', error)
    throw error
  }
}
