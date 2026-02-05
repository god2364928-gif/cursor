import { Progress } from './types'

interface ProgressBarProps {
  progress: Progress
  grade: string
}

const gradeColors: Record<string, { bg: string; text: string; bar: string }> = {
  S: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', bar: 'bg-gradient-to-r from-blue-500 to-blue-600' },
  A: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', bar: 'bg-gradient-to-r from-green-500 to-green-600' },
  B: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', bar: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
  C: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', bar: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
  D: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', bar: 'bg-gradient-to-r from-red-500 to-red-600' },
  F: { bg: 'bg-gray-50 dark:bg-gray-900/20', text: 'text-gray-700 dark:text-gray-300', bar: 'bg-gradient-to-r from-gray-500 to-gray-600' }
}

export default function ProgressBar({ progress, grade }: ProgressBarProps) {
  const colors = gradeColors[grade] || gradeColors.F
  const percentage = Math.min(100, Math.max(0, progress.progress_percent))

  return (
    <div className={`mt-4 p-4 rounded-lg ${colors.bg} border border-gray-200 dark:border-gray-700`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-sm font-semibold ${colors.text}`}>
          현재: {progress.current_value.toLocaleString()}{progress.metric_text}
        </span>
        <span className={`text-sm font-semibold ${colors.text}`}>
          목표: {progress.target_value.toLocaleString()}{progress.metric_text}
        </span>
      </div>
      
      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full ${colors.bar} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {percentage.toFixed(1)}% 달성
        </span>
        <span className={`text-xs font-bold ${colors.text}`}>
          {progress.gap.toLocaleString()}{progress.metric_text} 남음
        </span>
      </div>
    </div>
  )
}
