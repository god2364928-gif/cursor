import { CheckCircle2, XCircle, Eye, Heart, MessageCircle } from 'lucide-react'
import { ApiResponse } from './types'
import RadarChartComponent from './RadarChartComponent'
import { useI18nStore } from '../../i18n'

interface PDFStyleHeaderProps {
  result: ApiResponse['result']
  searchedId: string | null
}

export default function PDFStyleHeader({ result, searchedId }: PDFStyleHeaderProps) {
  const { t } = useI18nStore()
  const grade = result.grades?.overall || 'F'
  const score = result.grades?.overall_score || 0

  // 확산 적합 비율 계산
  const totalPosts = result.post_list?.length || 0
  const suitablePosts = result.post_list?.filter(post => 
    post.exposure_status === '확산 적합' || post.exposure_status === t('accountOpt2SpreadSuitableStatus')
  ).length || 0
  const suitablePercent = totalPosts > 0 ? ((suitablePosts / totalPosts) * 100).toFixed(1) : '0.0'

  // 등급별 색상 함수
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-blue-500'
      case 'A': return 'bg-green-500'
      case 'B': return 'bg-emerald-500'
      case 'C': return 'bg-yellow-500'
      case 'D': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getGradeTextColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-blue-500'
      case 'A': return 'text-green-500'
      case 'B': return 'text-emerald-500'
      case 'C': return 'text-yellow-500'
      case 'D': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 print:shadow-none print:break-inside-avoid print:rounded-none print:p-4">
      {/* 3단 컬럼 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 좌측 컬럼: 프로필 정보 */}
        <div className="space-y-4">
          {/* 프로필 */}
          <div className="flex items-start gap-3">
            {result.profile_image_url && (
              <img
                src={result.profile_image_url}
                alt={result.username}
                className="w-16 h-16 rounded-full object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {result.username}
              </h2>
              {result.full_name && (
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {result.full_name}
                </p>
              )}
            </div>
          </div>

          {/* 기본 스탯 */}
          <div className="grid grid-cols-3 gap-2 text-center py-3 bg-gray-50 dark:bg-gray-700 rounded-lg print:break-inside-avoid">
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {result.post_count}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('accountOpt2ProfilePosts')}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {result.follower_count.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('accountOpt2ProfileFollowers')}</div>
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {result.follow_count}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('accountOpt2ProfileFollowing')}</div>
            </div>
          </div>

          {/* 소개 문구 */}
          {result.biography && (
            <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {result.biography}
            </div>
          )}

          {/* 계정 인게이지먼트 */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2 print:break-inside-avoid">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('accountOpt2AccountEngagementTitle')}
            </h3>
            
            {/* 확산 적합 요약 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t('accountOpt2Last12PostsOf')} {suitablePercent}%{t('accountOpt2SuitableSpread')}
                </span>
              </div>
            </div>

            {/* 위기 상황 */}
            {parseFloat(suitablePercent) < 20 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded p-2 mb-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                    {t('accountOpt2SpreadSuitable')}: 1{t('accountOpt2CountUnit')} / 12{t('accountOpt2CountUnit')}
                  </span>
                </div>
              </div>
            )}

            {/* 평균 지표 */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Heart className="w-3.5 h-3.5" />
                  <span>{t('accountOpt2AverageLikes')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.round(result.average_like_count || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{t('accountOpt2AverageComments')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.round(result.average_comment_count || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('accountOpt2AverageViews')}</span>
                </div>
                <span className="font-bold text-gray-900 dark:text-white">
                  {Math.round(result.average_video_view_count || 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 중앙 컬럼: 종합 등급 + 방사형 차트 */}
        <div className="space-y-4">
          {/* 종합 등급 */}
          <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('accountOpt2OverallGradeTitle')}</p>
            <div className={`text-7xl font-black mb-1 ${getGradeTextColor(grade)}`}>
              {grade}
            </div>
            
            {/* 상태 배지 */}
            {result.grade_text && (
              <div className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold ${
                result.grade_action_class === 'urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                result.grade_action_class === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {result.grade_text}
              </div>
            )}
          </div>

          {/* 계정 최적화 핵심 지표 */}
          <div className="print:break-inside-avoid">
            <h3 className="text-center text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('accountOpt2CoreMetricsTitle')}
            </h3>
            {result.category_data && result.category_data.length > 0 && (
              <RadarChartComponent categoryData={result.category_data} />
            )}
          </div>
        </div>

        {/* 우측 컬럼: 카테고리별 분석 */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
            {t('accountOpt2CategoryAnalysis')}
          </h3>
          
          {result.category_data && result.category_data.length > 0 && (
            <div className="space-y-4">
              {result.category_data.slice(0, 5).map((item, idx) => {
                // 등급을 점수로 변환하여 진행률 계산
                const gradeToPercent: { [key: string]: number } = {
                  S: 100,
                  A: 80,
                  B: 60,
                  C: 40,
                  D: 20,
                  F: 0,
                }
                const percent = gradeToPercent[item.grade] || 0

                return (
                  <div key={idx}>
                    {/* 지표명과 등급 */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                          {item.title}
                        </span>
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white ${getGradeColor(item.grade)}`}>
                          {item.grade}
                        </div>
                      </div>
                    </div>

                    {/* 진행 바 */}
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-1">
                      <div
                        className={`h-2.5 rounded-full transition-all duration-300 ${getGradeColor(item.grade)}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* 설명 */}
                    {item.insight && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                        {item.insight}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 최적화 미달 시 경고 메시지 */}
      {result.grade_action && result.grade_action_class === 'urgent' && (
        <div className="mt-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 rounded">
          <p className="text-xs text-red-800 dark:text-red-200 font-medium">
            {t('accountOpt2OptimizationDeficient')}
          </p>
        </div>
      )}
    </div>
  )
}
