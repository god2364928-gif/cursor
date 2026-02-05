import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts'

interface RadarChartComponentProps {
  categoryData: Array<{
    title: string
    grade: string
    current_status: {
      value: number
    }
  }>
}

export default function RadarChartComponent({ categoryData }: RadarChartComponentProps) {
  // 5개 카테고리 데이터를 방사형 차트 형식으로 변환
  const chartData = categoryData.slice(0, 5).map((item) => {
    // 등급을 점수로 변환 (S=100, A=80, B=60, C=40, D=20)
    const gradeToScore: { [key: string]: number } = {
      S: 100,
      A: 80,
      B: 60,
      C: 40,
      D: 20,
      F: 0,
    }
    
    return {
      category: item.title,
      score: gradeToScore[item.grade] || 0,
      fullMark: 100,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={320} className="print:h-64 print:break-inside-avoid">
      <RadarChart data={chartData}>
        <PolarGrid stroke="#e5e7eb" strokeWidth={1} />
        <PolarAngleAxis 
          dataKey="category" 
          tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 600 }}
          className="print:text-[9px]"
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
        <Radar
          name="점수"
          dataKey="score"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.5}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
