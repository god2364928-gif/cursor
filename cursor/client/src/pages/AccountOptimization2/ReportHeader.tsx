import { ApiResponse } from './types'
import { useI18nStore } from '../../i18n'

interface ReportHeaderProps {
  result: ApiResponse['result']
  searchedId: string | null
}

const gradeColorMap: Record<string, { 
  bg: string
  text: string
  badge: string
  ring: string 
}> = {
  S: { bg: 'bg-blue-50', text: 'text-blue-600', badge: 'bg-blue-500', ring: 'ring-blue-300' },
  A: { bg: 'bg-green-50', text: 'text-green-600', badge: 'bg-green-500', ring: 'ring-green-300' },
  B: { bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'bg-emerald-500', ring: 'ring-emerald-300' },
  C: { bg: 'bg-yellow-50', text: 'text-yellow-600', badge: 'bg-yellow-500', ring: 'ring-yellow-300' },
  D: { bg: 'bg-red-50', text: 'text-red-600', badge: 'bg-red-500', ring: 'ring-red-300' },
  F: { bg: 'bg-gray-50', text: 'text-gray-600', badge: 'bg-gray-500', ring: 'ring-gray-300' }
}

export default function ReportHeader({ result, searchedId }: ReportHeaderProps) {
  const { t, language } = useI18nStore()
  const grade = result.grades?.overall || 'F'
  const score = result.grades?.overall_score || 0
  const colors = gradeColorMap[grade] || gradeColorMap.F

  const today = new Date().toLocaleDateString(language === 'ja' ? 'ja-JP' : 'ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 print:shadow-none">
      {/* 상단: 분석 기준 날짜 */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {t('accountOpt2InstagramAnalysisReport')}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t('accountOpt2AnalysisBasis')} {today}
          </p>
        </div>
        {result.grade_action_class && (
          <div className={`px-4 py-2 rounded-full text-sm font-bold ${
            result.grade_action_class === 'urgent' 
              ? 'bg-red-500 text-white' 
              : result.grade_action_class === 'warning'
              ? 'bg-yellow-500 text-gray-900'
              : 'bg-blue-500 text-white'
          }`}>
            {result.grade_text || t('accountOpt2Analyzing')}
          </div>
        )}
      </div>

      {/* 메인 콘텐츠: 좌측 프로필 + 우측 종합 점수 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* 좌측: 프로필 정보 */}
        <div className="flex gap-6">
          {result.profile_image_url && (
            <div className="flex-shrink-0">
              <img
                src={result.profile_image_url}
                alt={result.username}
                className={`w-32 h-32 rounded-full border-4 ${colors.ring} ring-4 shadow-lg object-cover`}
              />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
                @{result.username}
              </h1>
              {result.full_name && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                  {result.full_name}
                </p>
              )}
            </div>

            {result.biography && (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4 line-clamp-3">
                {result.biography}
              </p>
            )}

            {/* 계정 상태 배지 */}
            {result.reaction_status && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {result.reaction_status}
                </span>
              </div>
            )}

            {/* 핵심 지표 요약 (가로 배치) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.follower_count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('accountOpt2FollowersLabel')}</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.average_like_count?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('accountOpt2AvgLikesLabel')}</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.post_count.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('accountOpt2PostsLabel')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 종합 점수 (큰 표시) */}
        <div className={`${colors.bg} dark:bg-gray-700/50 rounded-2xl p-8 flex flex-col items-center justify-center border-2 ${colors.ring} shadow-lg`}>
          <div className="text-center mb-4">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('accountOpt2OverallScoreLabel')}
            </p>
            <div className={`text-8xl font-black ${colors.text} leading-none mb-3`}>
              {score}
            </div>
            <div className="text-lg text-gray-500 dark:text-gray-400 mb-4">/ 100</div>
          </div>

          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${colors.badge} text-white shadow-2xl ring-8 ${colors.ring}`}>
            <span className="text-5xl font-black">{grade}</span>
          </div>
          
          <div className="mt-4 text-center">
            <p className={`text-lg font-bold ${colors.text}`}>
              {grade}{t('accountOpt2GradeSuffix')}
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 계정 액션 메시지 */}
      {result.grade_action && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className={`p-4 ${colors.bg} dark:bg-gray-700/30 rounded-lg border-l-4 ${colors.badge}`}>
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              💡 {result.grade_action}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
