import { Users, FileText, Calendar, TrendingUp, Hash, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { CategoryData } from './types'
import ProgressBar from './ProgressBar'
import { useI18nStore } from '../../i18n'

interface CategoryCardProps {
  data: CategoryData
  language: string
}

const iconMap: Record<string, JSX.Element> = {
  users: <Users className="h-7 w-7" />,
  content: <FileText className="h-7 w-7" />,
  calendar: <Calendar className="h-7 w-7" />,
  chart: <TrendingUp className="h-7 w-7" />,
  hashtag: <Hash className="h-7 w-7" />
}

const gradeColorMap: Record<string, { 
  badge: string
  bg: string
  border: string
  text: string 
}> = {
  S: { badge: 'bg-blue-500 text-white', bg: 'bg-blue-50 dark:bg-blue-900/10', border: 'border-blue-300', text: 'text-blue-600' },
  A: { badge: 'bg-green-500 text-white', bg: 'bg-green-50 dark:bg-green-900/10', border: 'border-green-300', text: 'text-green-600' },
  B: { badge: 'bg-emerald-500 text-white', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-300', text: 'text-emerald-600' },
  C: { badge: 'bg-yellow-500 text-gray-900', bg: 'bg-yellow-50 dark:bg-yellow-900/10', border: 'border-yellow-300', text: 'text-yellow-600' },
  D: { badge: 'bg-red-500 text-white', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-300', text: 'text-red-600' },
  F: { badge: 'bg-gray-500 text-white', bg: 'bg-gray-50 dark:bg-gray-900/10', border: 'border-gray-300', text: 'text-gray-600' }
}

export default function CategoryCard({ data, language }: CategoryCardProps) {
  const { t } = useI18nStore()
  const [isExpanded, setIsExpanded] = useState(false)
  const colors = gradeColorMap[data.grade] || gradeColorMap.F

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-md border ${colors.border} hover:shadow-xl transition-all duration-300 print:shadow-none print:break-inside-avoid`}>
      <div className="p-6">
        {/* 상단: 타이틀 + 등급 */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2.5 rounded-lg ${colors.bg}`}>
                <div className={colors.text}>
                  {iconMap[data.icon_type] || <FileText className="h-7 w-7" />}
                </div>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                {data.title}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">
              {data.desc}
            </p>
          </div>
          
          <div className="flex-shrink-0 ml-4">
            <div className={`w-16 h-16 rounded-xl ${colors.badge} shadow-lg flex items-center justify-center`}>
              <span className="text-3xl font-black">{data.grade}</span>
            </div>
          </div>
        </div>

        {/* 현재 수치 (크게 강조) */}
        <div className={`mb-4 p-5 ${colors.bg} rounded-xl border ${colors.border}`}>
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            {t('accountOpt2CurrentStatusTitle')}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-black ${colors.text}`}>
              {data.current_status.value.toLocaleString()}
            </span>
            <span className="text-xl font-bold text-gray-600 dark:text-gray-400">
              {data.current_status.unit}
            </span>
          </div>
          {data.current_status.text && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
              {data.current_status.text}
            </p>
          )}
        </div>

        {/* 프로그레스 바 (목표치까지) */}
        {data.progress && <ProgressBar progress={data.progress} grade={data.grade} />}

        {/* Insight 섹션 */}
        {data.insight && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">💡</span>
              <div>
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mb-1">
                  {t('accountOpt2InsightLabel')}
                </p>
                <p className="text-sm text-blue-900 dark:text-blue-200 leading-relaxed">
                  {data.insight}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 노하우 (접기/펼치기) */}
        {data.know_how && (
          <div className="mt-4">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center justify-between w-full p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-600"
            >
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span>📚</span>
                <span>{t('accountOpt2DetailedKnowHow')}</span>
              </span>
              {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
            </button>
            
            {isExpanded && (
              <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                  {data.know_how}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
