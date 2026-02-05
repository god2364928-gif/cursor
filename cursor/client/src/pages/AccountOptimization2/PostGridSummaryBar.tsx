import { ContentExposureStats } from './types'
import { useI18nStore } from '../../i18n'

interface PostGridSummaryBarProps {
  stats: ContentExposureStats
}

export default function PostGridSummaryBar({ stats }: PostGridSummaryBarProps) {
  const { t } = useI18nStore()
  const total = stats.suitable_count + stats.ambiguous_count + stats.unsuitable_count
  
  const suitablePercent = total > 0 ? (stats.suitable_count / total) * 100 : 0
  const ambiguousPercent = total > 0 ? (stats.ambiguous_count / total) * 100 : 0
  const unsuitablePercent = total > 0 ? (stats.unsuitable_count / total) * 100 : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-4 print:shadow-none">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {t('accountOpt2PostSpreadAnalysisTitle')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('accountOpt2TotalAnalyzed')} <span className="font-bold text-gray-900 dark:text-white">{total}{t('accountOpt2CountUnit')}</span> {t('accountOpt2Analyzed')}
        </p>
      </div>

      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-green-700 dark:text-green-300">{t('accountOpt2SpreadSuitableShort')}</span>
            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">
            {stats.suitable_count}
          </div>
          <div className="text-xs font-semibold text-green-600 dark:text-green-400">
            {suitablePercent.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{t('accountOpt2SpreadAmbiguousShort')}</span>
            <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-yellow-600 dark:text-yellow-400 mb-1">
            {stats.ambiguous_count}
          </div>
          <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
            {ambiguousPercent.toFixed(1)}%
          </div>
        </div>

        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-red-700 dark:text-red-300">{t('accountOpt2SpreadUnsuitableShort')}</span>
            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <div className="text-3xl font-black text-red-600 dark:text-red-400 mb-1">
            {stats.unsuitable_count}
          </div>
          <div className="text-xs font-semibold text-red-600 dark:text-red-400">
            {unsuitablePercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 프로그레스 바 */}
      <div className="relative w-full h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 left-0 h-full bg-green-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-700"
          style={{ width: `${suitablePercent}%` }}
        >
          {suitablePercent > 8 && `${stats.suitable_count}${t('accountOpt2CountUnit')}`}
        </div>
        <div 
          className="absolute top-0 h-full bg-yellow-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-700"
          style={{ left: `${suitablePercent}%`, width: `${ambiguousPercent}%` }}
        >
          {ambiguousPercent > 8 && `${stats.ambiguous_count}${t('accountOpt2CountUnit')}`}
        </div>
        <div 
          className="absolute top-0 right-0 h-full bg-red-500 flex items-center justify-center text-white text-xs font-bold transition-all duration-700"
          style={{ width: `${unsuitablePercent}%` }}
        >
          {unsuitablePercent > 8 && `${stats.unsuitable_count}${t('accountOpt2CountUnit')}`}
        </div>
      </div>

      {/* 경고 메시지 (부적합이 많은 경우) */}
      {unsuitablePercent > 60 && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-lg">
          <p className="text-sm font-semibold text-red-800 dark:text-red-200 flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{t('accountOpt2HighUnsuitableWarning')} {unsuitablePercent.toFixed(0)}%{t('accountOpt2HighUnsuitableWarning2')}</span>
          </p>
        </div>
      )}
    </div>
  )
}
