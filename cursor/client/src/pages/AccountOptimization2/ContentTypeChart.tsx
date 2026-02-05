import { useI18nStore } from '../../i18n'

interface ContentTypeChartProps {
  photoRate: number
  carouselRate: number
  reelsRate: number
}

export default function ContentTypeChart({ photoRate, carouselRate, reelsRate }: ContentTypeChartProps) {
  const { t } = useI18nStore()
  // 비율을 백분율로 변환
  const total = photoRate + carouselRate + reelsRate
  const photoPercent = total > 0 ? (photoRate / total) * 100 : 0
  const carouselPercent = total > 0 ? (carouselRate / total) * 100 : 0
  const reelsPercent = total > 0 ? (reelsRate / total) * 100 : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 print:shadow-none">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        {t('accountOpt2ContentTypeDistributionTitle')}
      </h3>

      {/* 가로 바 차트 */}
      <div className="space-y-6">
        {/* 여러장 (캐러셀) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('accountOpt2MultiplePhotosLabel')}</span>
            </div>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {carouselPercent.toFixed(1)}%
            </span>
          </div>
          <div className="relative w-full h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-end pr-3 transition-all duration-700 ease-out"
              style={{ width: `${carouselPercent}%` }}
            >
              {carouselPercent > 10 && (
                <span className="text-white text-xs font-bold">
                  {carouselRate.toFixed(0)}{t('accountOpt2CountUnit')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 릴스 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('accountOpt2ReelsLabel')}</span>
            </div>
            <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
              {reelsPercent.toFixed(1)}%
            </span>
          </div>
          <div className="relative w-full h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-end pr-3 transition-all duration-700 ease-out"
              style={{ width: `${reelsPercent}%` }}
            >
              {reelsPercent > 10 && (
                <span className="text-white text-xs font-bold">
                  {reelsRate.toFixed(0)}{t('accountOpt2CountUnit')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 단일 사진 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('accountOpt2SinglePhotoLabel')}</span>
            </div>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {photoPercent.toFixed(1)}%
            </span>
          </div>
          <div className="relative w-full h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-end pr-3 transition-all duration-700 ease-out"
              style={{ width: `${photoPercent}%` }}
            >
              {photoPercent > 10 && (
                <span className="text-white text-xs font-bold">
                  {photoRate.toFixed(0)}{t('accountOpt2CountUnit')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 총합 표시 */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {t('accountOpt2TotalPosts')}
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {total.toFixed(0)}{t('accountOpt2CountUnit')}
          </span>
        </div>
      </div>
    </div>
  )
}
