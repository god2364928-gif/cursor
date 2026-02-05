import { HeroScoreSectionProps } from './types'
import { useI18nStore } from '../../i18n'

const gradeColors: Record<string, { gradient: string; glow: string; text: string }> = {
  S: { gradient: 'from-blue-500 to-blue-600', glow: 'shadow-blue-500/50', text: 'text-blue-500' },
  A: { gradient: 'from-green-500 to-green-600', glow: 'shadow-green-500/50', text: 'text-green-500' },
  B: { gradient: 'from-emerald-500 to-emerald-600', glow: 'shadow-emerald-500/50', text: 'text-emerald-500' },
  C: { gradient: 'from-yellow-500 to-orange-500', glow: 'shadow-yellow-500/50', text: 'text-yellow-500' },
  D: { gradient: 'from-red-500 to-red-600', glow: 'shadow-red-500/50', text: 'text-red-500' },
  F: { gradient: 'from-gray-500 to-gray-600', glow: 'shadow-gray-500/50', text: 'text-gray-500' }
}

export default function HeroScoreSection({ 
  overallScore, 
  overallGrade, 
  gradeText, 
  gradeAction,
  gradeActionClass 
}: HeroScoreSectionProps) {
  const { t } = useI18nStore()
  const colors = gradeColors[overallGrade] || gradeColors.F
  const percentage = Math.min(100, Math.max(0, overallScore))
  
  // 게이지를 위한 SVG 원 계산
  const radius = 100
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl overflow-hidden">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      <div className="relative p-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          {/* 좌측: 설명 텍스트 */}
          <div className="flex-1 text-center lg:text-left">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              {t('accountOpt2OverallScoreTitle')}
            </h2>
            <p className="text-xl text-gray-300 mb-6">
              {t('accountOpt2OverallScoreDesc')}
            </p>
            
            <div className={`inline-block px-6 py-3 rounded-full ${gradeActionClass === 'urgent' ? 'bg-red-500' : 'bg-yellow-500'} text-white font-bold text-lg mb-2`}>
              {gradeText}
            </div>
            
            <p className="text-gray-400 text-sm mt-4 max-w-md">
              {gradeAction}
            </p>
          </div>

          {/* 중앙/우측: 게이지 차트 */}
          <div className="relative">
            {/* 발광 효과 */}
            <div className={`absolute inset-0 rounded-full blur-3xl ${colors.glow} opacity-50`}></div>
            
            <div className="relative">
              <svg width="280" height="280" viewBox="0 0 280 280" className="transform -rotate-90">
                {/* 배경 원 */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="20"
                  fill="none"
                />
                
                {/* 진행 원 */}
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  stroke="url(#gradient)"
                  strokeWidth="20"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: 'drop-shadow(0 0 10px currentColor)' }}
                />
                
                {/* 그라데이션 정의 */}
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" className={colors.text} />
                    <stop offset="100%" className={colors.text} style={{ stopOpacity: 0.6 }} />
                  </linearGradient>
                </defs>
              </svg>

              {/* 중앙 텍스트 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className={`text-7xl font-black ${colors.text} mb-2`}>
                  {overallScore}
                </div>
                <div className="text-sm text-gray-400 mb-3">/ 100</div>
                <div className={`text-5xl font-black ${colors.text}`}>
                  {overallGrade}
                </div>
                <div className="text-xs text-gray-500 mt-2">{t('accountOpt2GradeLabel')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 하단: 등급 범례 */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {Object.entries(gradeColors).map(([grade, style]) => (
              <div key={grade} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${style.gradient}`}></div>
                <span className={`font-semibold ${overallGrade === grade ? style.text : 'text-gray-500'}`}>
                  {grade}{t('accountOpt2GradeSuffix')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
