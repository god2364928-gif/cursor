import { Users, FileText, Calendar, TrendingUp, Hash, Target, Lightbulb } from 'lucide-react'
import { CategoryData } from './types'
import { useI18nStore } from '../../i18n'

interface ActionPlanCardProps {
  categoryData: CategoryData[]
  language: string
}

const iconMap: Record<string, JSX.Element> = {
  users: <Users className="h-6 w-6" />,
  content: <FileText className="h-6 w-6" />,
  calendar: <Calendar className="h-6 w-6" />,
  chart: <TrendingUp className="h-6 w-6" />,
  hashtag: <Hash className="h-6 w-6" />
}

const gradeColorMap: Record<string, {
  badge: string
  border: string
  bg: string
  progressBar: string
  text: string
}> = {
  S: { badge: 'bg-blue-500 text-white', border: 'border-blue-300', bg: 'bg-blue-50 dark:bg-blue-900/10', progressBar: 'bg-blue-400', text: 'text-blue-600' },
  A: { badge: 'bg-green-500 text-white', border: 'border-green-300', bg: 'bg-green-50 dark:bg-green-900/10', progressBar: 'bg-green-400', text: 'text-green-600' },
  B: { badge: 'bg-emerald-500 text-white', border: 'border-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-900/10', progressBar: 'bg-emerald-400', text: 'text-emerald-600' },
  C: { badge: 'bg-yellow-500 text-gray-900', border: 'border-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-900/10', progressBar: 'bg-yellow-400', text: 'text-yellow-600' },
  D: { badge: 'bg-red-500 text-white', border: 'border-red-300', bg: 'bg-red-50 dark:bg-red-900/10', progressBar: 'bg-red-400', text: 'text-red-600' },
  F: { badge: 'bg-gray-500 text-white', border: 'border-gray-300', bg: 'bg-gray-50 dark:bg-gray-900/10', progressBar: 'bg-gray-400', text: 'text-gray-600' }
}

export default function ActionPlanCard({ categoryData, language }: ActionPlanCardProps) {
  const { t } = useI18nStore()
  
  // 단위 번역 함수
  const translateUnit = (unit: string) => {
    if (language !== 'ja') return unit
    
    const unitMap: Record<string, string> = {
      '개': '個',
      '명': '名',
      '회': '回',
      '일': '日',
      '시간': '時間',
      '분': '分',
      '%': '%',
    }
    
    return unitMap[unit] || unit
  }
  
  return (
    <div className="space-y-8 print:space-y-4">
      {/* 섹션 헤더 */}
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">
          {t('accountOpt2ImprovementPlanTitle')}
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          {t('accountOpt2ExpertAnalysisSubtitle')}
        </p>
      </div>

      {/* 각 항목별 상세 카드 */}
      {categoryData.map((item, index) => {
        const colors = gradeColorMap[item.grade] || gradeColorMap.F
        const icon = iconMap[item.icon_type] || <FileText className="h-6 w-6" />
        
        // 등급 전환 표시 (현재 등급 → 목표 등급)
        const nextGradeMap: Record<string, string> = { 'D': 'C', 'C': 'B', 'B': 'A', 'A': 'S', 'S': 'S+', 'F': 'D' }
        const nextGrade = nextGradeMap[item.grade] || 'S'
        
        // 진행률 계산
        let progressPercent = item.progress?.progress_percent || 0
        
        // progress 데이터가 없지만 current_status가 있는 경우 (예: 이미 목표 달성)
        if (!item.progress && item.current_status) {
          // S등급은 이미 최고 등급이므로 100%
          if (item.grade === 'S') {
            progressPercent = 100
          }
          // 다른 등급의 경우, current_status 값이 있으면 일정 비율로 표시
          // 실제 데이터가 없으므로 현재 등급에 따라 추정
          else {
            const gradeProgressMap: Record<string, number> = {
              'A': 90,
              'B': 70,
              'C': 50,
              'D': 30,
              'F': 10
            }
            progressPercent = gradeProgressMap[item.grade] || 0
          }
        }

        return (
          <div
            key={index}
            className={`bg-white dark:bg-gray-800 rounded-3xl border-2 ${colors.border} p-7 print:break-inside-avoid print:shadow-none shadow-md hover:shadow-xl transition-shadow print:rounded-lg print:p-4 print:mb-3`}
          >
            {/* 카드 헤더 */}
            <div className="flex items-center justify-between mb-6 pb-5 border-b-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                  <div className={colors.text}>
                    {icon}
                  </div>
                </div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  {item.title}
                </h3>
              </div>
              <div className={`px-5 py-2 rounded-xl ${colors.badge} shadow-lg text-2xl font-black`}>
                {item.grade}
              </div>
            </div>

            {/* 현재 상태 (Full-width) */}
            <div className={`mb-8 p-6 rounded-2xl ${colors.bg} border-2 ${colors.border}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Target className={`h-5 w-5 ${colors.text}`} />
                  <h4 className="text-base font-black text-gray-800 dark:text-gray-200">{t('accountOpt2CurrentStatusTitle')}</h4>
                </div>
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {item.current_status.value.toLocaleString()}{translateUnit(item.current_status.unit)}
                </span>
              </div>

              {/* 등급 전환 프로그레스 바 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    {item.grade}{t('accountOpt2GradeUpTo')}{nextGrade}{t('accountOpt2GradeSuffix')}
                  </span>
                </div>
                
                {/* 프로그레스 바와 퍼센트 */}
                <div className="relative">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 relative overflow-hidden">
                    {/* 진행 바 */}
                    <div
                      className={`h-8 rounded-full ${colors.progressBar} transition-all duration-500 absolute top-0 left-0`}
                      style={{ width: `${Math.min(progressPercent, 100)}%` }}
                    />
                    {/* 퍼센트 텍스트 (항상 바 안쪽 오른쪽에 표시) */}
                    <div className="absolute inset-0 flex items-center justify-end pr-3">
                      <span className="text-xs font-bold text-white drop-shadow-md whitespace-nowrap z-10">
                        {progressPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* 등급 상승 가이드 문구 */}
                {item.progress ? (
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span className={`${colors.text} font-bold`}>{item.progress.gap.toLocaleString()}{item.progress.metric === 'count' ? t('accountOpt2CountUnit') : translateUnit(item.current_status.unit)}</span>{t('accountOpt2MoreToSecure')} <span className="font-bold">{nextGrade}{t('accountOpt2GradeSuffix')}</span>{t('accountOpt2UpgradeToGrade')}
                  </p>
                ) : progressPercent >= 100 ? (
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    <span className={`${colors.text} font-bold`}>{t('accountOpt2GoalAchieved')}</span> {nextGrade}{t('accountOpt2GradeSuffix')} {t('accountOpt2AlreadyMeetsCriteria')}
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {nextGrade}{t('accountOpt2GradeSuffix')} {t('accountOpt2WorkingTowardsGrade')}
                  </p>
                )}
              </div>
              
              {/* 현재 상태 안내 문구 (노란색 경고) */}
              {item.current_status.text && (
                <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 rounded">
                  <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{item.current_status.text}</span>
                  </p>
                </div>
              )}
              
              {/* 확산 적합도 정보 (계정 확산도 섹션용) */}
              {item.exposure_stats && (
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-3 rounded">
                  <p className="text-xs font-semibold text-red-800 dark:text-red-200">
                    <span className="flex items-center gap-2 mb-1">
                      <span>⚠️</span>
                      <span>{t('accountOpt2SpreadSuitable')}: {item.exposure_stats.suitable_count}{t('accountOpt2CountUnit')} / 12{t('accountOpt2CountUnit')}</span>
                    </span>
                    {item.exposure_stats.unsuitable_count > 0 && (
                      <span className="block ml-6 mt-1">
                        {t('accountOpt2SpreadUnsuitable')}: {item.exposure_stats.unsuitable_count}{t('accountOpt2CountUnit')} / 12{t('accountOpt2CountUnit')}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* 내용 영역 (2컬럼 그리드) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* 좌측: 운영 노하우 */}
              <div className="border-2 border-gray-200 dark:border-gray-600 rounded-2xl p-5 bg-gray-50 dark:bg-gray-700/30">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h5 className="text-sm font-black text-gray-900 dark:text-white">{t('accountOpt2OperationKnowHowTitle')}</h5>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {item.know_how || t('accountOpt2NoKnowHow')}
                </p>
              </div>

              {/* 우측: 권장 조치 */}
              <div className="border-2 border-gray-200 dark:border-gray-600 rounded-2xl p-5 bg-gray-50 dark:bg-gray-700/30">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <h5 className="text-sm font-black text-gray-900 dark:text-white">{t('accountOpt2RecommendedActionsTitle')}</h5>
                </div>
                {item.action?.recommendations && item.action.recommendations.length > 0 ? (
                  <ul className="space-y-3">
                    {item.action.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex-shrink-0">•</span>
                        <div>
                          <p className="text-xs font-bold text-gray-900 dark:text-white mb-1">
                            {rec.title}
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {rec.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('accountOpt2NoRecommendations')}
                  </p>
                )}

                {/* 기대효과 */}
                {item.insight && (
                  <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-600">
                    <p className="text-xs font-black text-gray-800 dark:text-gray-200 mb-2">{t('accountOpt2ExpectedEffectLabel')}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed pl-3 border-l-2 border-gray-300 dark:border-gray-600">
                      {item.insight}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
