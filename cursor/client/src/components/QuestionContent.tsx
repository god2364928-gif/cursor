// 시험 문항 본문을 표/불릿/소제목/문단으로 보기 좋게 렌더링하는 공용 컴포넌트
export default function QuestionContent({ text }: { text: string }) {
  const lines = text.split('\n')
  const blocks: JSX.Element[] = []
  let i = 0

  while (i < lines.length) {
    const raw = lines[i]
    const line = raw.trim()

    if (line === '') {
      i++
      continue
    }

    // 표: 「｜」가 포함된 연속된 줄들을 묶어 테이블로
    if (raw.includes('｜')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].includes('｜')) {
        tableLines.push(lines[i])
        i++
      }
      const rows = tableLines.map((l) => l.split('｜').map((c) => c.trim()))
      const [header, ...body] = rows
      blocks.push(
        <div key={blocks.length} className="overflow-x-auto my-1 rounded border border-gray-300">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th
                    key={ci}
                    className="border border-gray-300 bg-gray-200 px-2 py-1.5 text-left font-semibold text-gray-700"
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => {
                const emphasized = r[0]?.startsWith('小計') || r[0]?.startsWith('合計')
                return (
                  <tr key={ri} className={emphasized ? 'bg-blue-50 font-semibold' : 'bg-white'}>
                    {r.map((c, ci) => (
                      <td key={ci} className="border border-gray-300 px-2 py-1.5 align-top">
                        {c}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    // 소제목: 【...】
    if (line.startsWith('【')) {
      blocks.push(
        <p key={blocks.length} className="font-semibold text-gray-900 mt-2">
          {line}
        </p>
      )
      i++
      continue
    }

    // 불릿: ・로 시작하는 연속된 줄들
    if (line.startsWith('・')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('・')) {
        items.push(lines[i].trim().slice(1).trim())
        i++
      }
      blocks.push(
        <ul key={blocks.length} className="list-disc pl-5 space-y-1">
          {items.map((it, ii) => (
            <li key={ii}>{it}</li>
          ))}
        </ul>
      )
      continue
    }

    // 일반 문단
    blocks.push(
      <p key={blocks.length} className={/^\(\d+\)/.test(line) ? 'mt-1' : ''}>
        {line}
      </p>
    )
    i++
  }

  return <div className="space-y-1.5">{blocks}</div>
}
