import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts'
import { Heart, MessageCircle, BarChart3, Grid3x3 } from 'lucide-react'
import { ApiResponse } from './types'
import { useI18nStore } from '../../i18n'

interface ContentAnalysisSectionProps {
  result: ApiResponse['result']
}

export default function ContentAnalysisSection({ result }: ContentAnalysisSectionProps) {
  const { t } = useI18nStore()
  
  // 도넛 차트 데이터 준비
  const total = result.post_count || 12
  const carouselCount = Math.round((result.carousel_rate / 100) * total)
  const reelsCount = Math.round((result.reels_rate / 100) * total)
  const photoCount = Math.round((result.photo_rate / 100) * total)

  const chartData = [
    { name: t('accountOpt2MultiplePhotosShort'), value: result.carousel_rate, count: carouselCount, color: '#1e40af' },
    { name: t('accountOpt2ReelsShort'), value: result.reels_rate, count: reelsCount, color: '#7c3aed' },
    { name: t('accountOpt2SinglePhotoShort'), value: result.photo_rate, count: photoCount, color: '#10b981' },
  ]

  // 확산 통계
  const suitableCount = result.content_exposure_stats?.suitable_count || 0
  const ambiguousCount = result.content_exposure_stats?.ambiguous_count || 0
  const unsuitableCount = result.content_exposure_stats?.unsuitable_count || 0
  const totalPosts = suitableCount + ambiguousCount + unsuitableCount

  // 평균 총 반응 계산
  const averageTotalReaction = Math.round((result.average_like_count || 0) + (result.average_comment_count || 0))

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 print:shadow-none print:break-before-page print:rounded-none print:p-4">
      {/* 2단 컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 좌측: 콘텐츠 타입 분포 분석 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {t('accountOpt2ContentTypeDistribution')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {t('accountOpt2Last12PostsBasisShort')}
          </p>

          {/* 도넛 차트 */}
          <div className="h-64 print:h-48 print:break-inside-avoid">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}\n${value.toFixed(1)}%`}
                  labelLine={true}
                  isAnimationActive={false}
                  style={{ fontSize: '11px', fontWeight: 600 }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 하단 요약 카드 */}
          <div className="grid grid-cols-3 gap-3 mt-4 print:break-inside-avoid">
            {/* 단일사진 */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center bg-green-50 dark:bg-green-900/10">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('accountOpt2SinglePhotoShort')}</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {result.photo_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {photoCount}{t('accountOpt2PhotosUnit')}
              </div>
            </div>

            {/* 릴스 */}
            <div className="border-2 border-purple-400 dark:border-purple-500 rounded-lg p-3 text-center bg-purple-50 dark:bg-purple-900/10">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('accountOpt2ReelsShort')}</div>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {result.reels_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {reelsCount}{t('accountOpt2PhotosUnit')}
              </div>
            </div>

            {/* 여러장 */}
            <div className="border-2 border-blue-400 dark:border-blue-500 rounded-lg p-3 text-center bg-blue-50 dark:bg-blue-900/10">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{t('accountOpt2MultiplePhotosShort')}</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {result.carousel_rate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {carouselCount}{t('accountOpt2PhotosUnit')}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 콘텐츠 성과 분석 */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            {t('accountOpt2ContentPerformanceTitle')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            {t('accountOpt2VisitorAnalysis')}
          </p>

          {/* 평균 지표 카드 */}
          <div className="grid grid-cols-3 gap-3 mb-4 print:break-inside-avoid">
            {/* 평균 총 반응 */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center justify-center gap-1 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('accountOpt2AvgTotalReactionShort')}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {averageTotalReaction}
              </div>
            </div>

            {/* 평균 좋아요 */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center bg-pink-50 dark:bg-pink-900/10">
              <div className="flex items-center justify-center gap-1 mb-2">
                <Heart className="w-4 h-4 text-pink-600" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('accountOpt2AvgLikesShort')}</span>
              </div>
              <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                {Math.round(result.average_like_count || 0)}
              </div>
            </div>

            {/* 평균 댓글 */}
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 text-center bg-blue-50 dark:bg-blue-900/10">
              <div className="flex items-center justify-center gap-1 mb-2">
                <MessageCircle className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-600 dark:text-gray-400">{t('accountOpt2AvgCommentsShort')}</span>
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Math.round(result.average_comment_count || 0)}
              </div>
            </div>
          </div>

          {/* 게시물 분포 분석 */}
          {result.distribution_advice && (
            <div className="border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-start gap-2 mb-2">
                <Grid3x3 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">{t('accountOpt2DistributionAnalysisTitle')}</h4>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {result.distribution_advice}
              </p>
            </div>
          )}

          {/* 종합 분석 브리핑 */}
          {result.content_briefing && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                {t('accountOpt2ComprehensiveBriefingTitle')}
              </h4>
              <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                {result.content_briefing.split('\n').map((line, idx) => (
                  line.trim() && (
                    <p key={idx} className="pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                      {line}
                    </p>
                  )
                ))}
                
                {/* 확산 적합도 하이라이트 */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <p className="font-semibold mb-1">{t('accountOpt2SpreadSuitabilityResult')}</p>
                  <div className="flex gap-3 text-xs">
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {t('accountOpt2SuitableShort')} {suitableCount}{t('accountOpt2CountUnit')}
                    </span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-400">
                      {t('accountOpt2AmbiguousShort')} {ambiguousCount}{t('accountOpt2CountUnit')}
                    </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {t('accountOpt2UnsuitableShort')} {unsuitableCount}{t('accountOpt2CountUnit')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
