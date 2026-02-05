import { CheckCircle, AlertCircle, XCircle, TrendingUp } from 'lucide-react'
import { ContentExposureStats } from './types'
import { useI18nStore } from '../../i18n'

interface PDFStyleExposureSummaryProps {
  stats: ContentExposureStats
}

export default function PDFStyleExposureSummary({ stats }: PDFStyleExposureSummaryProps) {
  const { t } = useI18nStore()
  const total = stats.suitable_count + stats.ambiguous_count + stats.unsuitable_count
  
  const suitablePercent = total > 0 ? ((stats.suitable_count / total) * 100).toFixed(1) : '0.0'
  const ambiguousPercent = total > 0 ? ((stats.ambiguous_count / total) * 100).toFixed(1) : '0.0'
  const unsuitablePercent = total > 0 ? ((stats.unsuitable_count / total) * 100).toFixed(1) : '0.0'

  // 부적합 비율이 높으면 경고
  const isHighRisk = parseFloat(unsuitablePercent) > 60

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 print:shadow-none print:break-before-page print:rounded-none print:p-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
        {t('accountOpt2PostSpreadSuitability')}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
        {t('accountOpt2VisitorAnalysis')}
      </p>

      {/* 핵심 인사이트 박스 */}
      <div className={`mb-6 p-4 rounded-xl border-2 ${
        isHighRisk 
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' 
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${isHighRisk ? 'text-red-600' : 'text-blue-600'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              {t('accountOpt2KeyInsightTitle')}
            </h3>
            <p className={`text-sm leading-relaxed ${
              isHighRisk 
                ? 'text-red-800 dark:text-red-200' 
                : 'text-blue-800 dark:text-blue-200'
            }`}>
              {t('accountOpt2CurrentPostsPrefix')} <span className="font-bold text-lg">{unsuitablePercent}%</span>{t('accountOpt2GuidelineNonCompliant')} 
              <span className="font-bold"> {t('accountOpt2ImprovementReachIncrease')}</span> {t('accountOpt2PossibleSuffix')}
            </p>
          </div>
        </div>
      </div>

      {/* 3개 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 확산 적합 */}
        <div className="border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-5 bg-blue-50/50 dark:bg-blue-900/10 hover:shadow-lg transition-shadow">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center ring-4 ring-blue-100 dark:ring-blue-900/30">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          <h3 className="text-center font-bold text-gray-900 dark:text-white mb-3">
            {t('accountOpt2SpreadSuitable')}
          </h3>
          
          <div className="text-center mb-3">
            <span className="text-5xl font-black text-blue-600 dark:text-blue-400">
              {stats.suitable_count}{t('accountOpt2CountUnit')}
            </span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 ml-2">
              {suitablePercent}%
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-full h-3 mb-4">
            <div
              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${suitablePercent}%` }}
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t('accountOpt2PostAnalysisResultTitle')}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-4">
              {t('accountOpt2SuitableDescShort')}
            </p>
          </div>

          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            {t('accountOpt2SpreadPossibleBtn')}
          </button>
        </div>

        {/* 확산 모호 */}
        <div className="border-2 border-gray-300 dark:border-gray-600 rounded-2xl p-5 bg-gray-50/50 dark:bg-gray-700/20 hover:shadow-lg transition-shadow">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-500 flex items-center justify-center ring-4 ring-gray-100 dark:ring-gray-800/30">
              <AlertCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          <h3 className="text-center font-bold text-gray-900 dark:text-white mb-3">
            {t('accountOpt2SpreadAmbiguous')}
          </h3>
          
          <div className="text-center mb-3">
            <span className="text-5xl font-black text-gray-600 dark:text-gray-400">
              {stats.ambiguous_count}{t('accountOpt2CountUnit')}
            </span>
            <span className="text-xl font-bold text-gray-600 dark:text-gray-400 ml-2">
              {ambiguousPercent}%
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-4">
            <div
              className="bg-gray-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${ambiguousPercent}%` }}
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t('accountOpt2PostAnalysisResultTitle')}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-4">
              {t('accountOpt2AmbiguousDescShort')}
            </p>
          </div>

          <button className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            {t('accountOpt2ImprovementNeededBtn')}
          </button>
        </div>

        {/* 확산 부적합 */}
        <div className="border-2 border-red-300 dark:border-red-700 rounded-2xl p-5 bg-red-50/50 dark:bg-red-900/10 hover:shadow-lg transition-shadow">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center ring-4 ring-red-100 dark:ring-red-900/30">
              <XCircle className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
          </div>
          
          <h3 className="text-center font-bold text-gray-900 dark:text-white mb-3">
            {t('accountOpt2SpreadUnsuitable')}
          </h3>
          
          <div className="text-center mb-3">
            <span className="text-5xl font-black text-red-600 dark:text-red-400">
              {stats.unsuitable_count}{t('accountOpt2CountUnit')}
            </span>
            <span className="text-xl font-bold text-red-600 dark:text-red-400 ml-2">
              {unsuitablePercent}%
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="w-full bg-red-100 dark:bg-red-900/30 rounded-full h-3 mb-4">
            <div
              className="bg-red-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${unsuitablePercent}%` }}
            />
          </div>
          
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {t('accountOpt2PostAnalysisResultTitle')}
              </p>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed pl-4">
              {t('accountOpt2UnsuitableDescShort')}
            </p>
          </div>

          <button className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition-colors">
            {t('accountOpt2ImmediateImprovementBtn')}
          </button>
        </div>
      </div>
    </div>
  )
}
