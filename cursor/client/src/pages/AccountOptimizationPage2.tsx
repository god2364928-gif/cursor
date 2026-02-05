import { useState } from 'react'
import { Search, Loader2, AlertCircle, Printer } from 'lucide-react'
import api from '../lib/api'
import { useI18nStore } from '../i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import PDFStyleHeader from './AccountOptimization2/PDFStyleHeader'
import ContentAnalysisSection from './AccountOptimization2/ContentAnalysisSection'
import PDFStyleExposureSummary from './AccountOptimization2/PDFStyleExposureSummary'
import PostGridItem from './AccountOptimization2/PostGridItem'
import ActionPlanCard from './AccountOptimization2/ActionPlanCard'
import PrintPageFooter from './AccountOptimization2/PrintPageFooter'
import { ApiResponse } from './AccountOptimization2/types'
import { exportReportToPdf } from '../utils/pdfExport'

export default function AccountOptimizationPage2() {
  const { t, language } = useI18nStore()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiResponse['result'] | null>(null)
  const [searchedId, setSearchedId] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [pdfExporting, setPdfExporting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setSearchedId(trimmed)

    try {
      const response = await api.get<ApiResponse>('/account-optimization-2', {
        params: { 
          id: trimmed,
          lang: language // 언어 정보 전달
        },
      })

      if (response.data.status === 'success' && response.data.result) {
        setResult(response.data.result)
        setHistory((prev) => {
          const deduped = prev.filter((item) => item !== trimmed)
          return [trimmed, ...deduped].slice(0, 5)
        })
      } else {
        setResult(null)
        setError('분석 결과를 가져오는데 실패했습니다.')
      }
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        '분석에 실패했습니다. 잠시 후 다시 시도해주세요.'
      setError(message)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handlePdfExport = async () => {
    if (!searchedId || !result) return
    
    setPdfExporting(true)
    try {
      // 회사명 추출 (full_name 또는 username 사용)
      const companyName = result.full_name || result.username || searchedId
      
      await exportReportToPdf({
        accountId: searchedId,
        companyName: companyName,
        date: new Date().toISOString().split('T')[0],
        language: language
      })
    } catch (err: any) {
      setError(err.message || 'PDF 저장에 실패했습니다.')
    } finally {
      setPdfExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 space-y-6 print:bg-white print:p-0 print:m-0 print:w-full">
      {/* 헤더 - 화면용만 */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl shadow-xl p-8 text-white print:hidden hide-on-pdf">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          {t('accountOpt2Title')}
        </h1>
        <p className="text-blue-100">
          {t('accountOpt2Subtitle')}
        </p>
      </div>

      {/* 검색 폼 - 화면용만 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 print:hidden hide-on-pdf">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('instagram')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder=""
                disabled={loading}
                className="pl-10 h-12 text-base"
              />
            </div>
            
            {history.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {t('accountOpt2RecentSearches')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <Button
                      key={item}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuery(item)}
                      className="text-xs"
                    >
                      {item}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-end gap-2">
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  {t('accountOpt2Analyzing')}
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 mr-2" />
                  {t('accountOpt2Analyze')}
                </>
              )}
            </Button>
            
            {result && (
              <Button
                type="button"
                onClick={handlePdfExport}
                disabled={pdfExporting}
                className="h-12 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold shadow-lg disabled:opacity-50 hide-on-pdf"
              >
                {pdfExporting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    PDF 생성 중...
                  </>
                ) : (
                  <>
                    <Printer className="h-5 w-5 mr-2" />
                    {t('accountOpt2PrintPDF')}
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-xl p-6 print:hidden hide-on-pdf">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
                {t('accountOpt2AnalysisFailed')}
              </h3>
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && !result && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-16 text-center print:hidden hide-on-pdf">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {t('accountOpt2Analyzing')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('accountOpt2FirstAnalysis')}
          </p>
        </div>
      )}

      {/* 결과 없음 */}
      {!loading && !result && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-16 text-center border-2 border-dashed border-gray-300 dark:border-gray-700 print:hidden hide-on-pdf">
          <Search className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
            {t('accountOpt2NoAnalysis')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {t('accountOpt2NoAnalysisDesc')}
          </p>
        </div>
      )}

      {/* PDF 스타일 분석 결과 */}
      {result && (
        <div id="report-root" className="space-y-8 print:space-y-0 print:w-full print:m-0">
          {/* 페이지 1: 종합 진단 (프로필 + 종합점수 + 핵심지표) */}
          {result.grades && (
            <div className="report-section print:break-inside-avoid">
              <PDFStyleHeader result={result} searchedId={searchedId} />
              <PrintPageFooter 
                pageNumber={1} 
                totalPages={4} 
                accountId={searchedId || result.username}
              />
            </div>
          )}

          {/* 페이지 2: 콘텐츠 상세 분석 (타입 분포 + 성과 분석) */}
          <div className="report-section print:break-before-page print:break-inside-avoid">
            <ContentAnalysisSection result={result} />
            <PrintPageFooter 
              pageNumber={2} 
              totalPages={4}
              accountId={searchedId || result.username}
            />
          </div>

          {/* 페이지 3: 게시물 진단 (확산 적합도 + 게시물 그리드) */}
          <div className="report-section print:break-before-page print:break-inside-avoid">
            {result.content_exposure_stats && (
              <div className="mb-6 print:break-inside-avoid">
                <PDFStyleExposureSummary stats={result.content_exposure_stats} />
              </div>
            )}

            {/* 게시물 그리드 */}
            {result.post_list && result.post_list.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 print:shadow-none print:break-inside-avoid print:rounded-none print:p-4">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 print:hidden">
                  {t('accountOpt2PostDetails')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 print:hidden">
                  {t('accountOpt2ClickForDetails')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 print:grid-cols-3 print:gap-3">
                  {result.post_list.slice(0, 12).map((post, index) => (
                    <PostGridItem key={index} post={post} language={language} />
                  ))}
                </div>
              </div>
            )}
            <PrintPageFooter 
              pageNumber={3} 
              totalPages={4}
              accountId={searchedId || result.username}
            />
          </div>

          {/* 페이지 4: 개선 제안 */}
          {result.category_data && result.category_data.length > 0 && (
            <div className="report-section print:break-before-page print:break-inside-avoid">
              <ActionPlanCard
                categoryData={result.category_data}
                language={language}
              />
              <PrintPageFooter 
                pageNumber={4} 
                totalPages={4}
                accountId={searchedId || result.username}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
