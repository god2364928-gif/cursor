import { readFileSync, writeFileSync, existsSync } from 'fs'

const API_BASE = 'https://ig-parser.decago.co.kr/api/instagram/v3/hashtag'
const CONCURRENCY = 15
const INPUT_FILE = '/Users/go/Downloads/일본 세수코 해시태그 26.2.26.txt'
const PREV_RESULT_FILE = '/Users/go/Desktop/hashtag_results.csv'
const OUTPUT_FILE = '/Users/go/Desktop/hashtag_results_final.csv'
const FILTERED_FILE = '/Users/go/Desktop/hashtag_10000plus_final.csv'
const PROGRESS_FILE = '/Users/go/Desktop/hashtag_progress.json'

const allHashtags = readFileSync(INPUT_FILE, 'utf-8')
  .split('\n')
  .map(s => s.trim())
  .filter(s => s.length > 0)

const prevResults = new Map()
if (existsSync(PREV_RESULT_FILE)) {
  const lines = readFileSync(PREV_RESULT_FILE, 'utf-8').split('\n').slice(1)
  for (const line of lines) {
    if (!line.trim()) continue
    const parts = line.split(',')
    const hashtag = parts[0]
    const pc = parts[1]?.trim()
    if (pc && pc !== '' && pc !== '0') {
      prevResults.set(hashtag, parseInt(pc))
    }
  }
}
console.log(`Previous successful results loaded: ${prevResults.size}`)

let progressData = { completed: {} }
if (existsSync(PROGRESS_FILE)) {
  try {
    progressData = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    console.log(`Resuming from progress file: ${Object.keys(progressData.completed).length} already done`)
  } catch {}
}

const needToFetch = allHashtags.filter(h => {
  if (prevResults.has(h)) return false
  if (progressData.completed[h] !== undefined) return false
  return true
})

console.log(`Total hashtags: ${allHashtags.length}`)
console.log(`Already have data: ${prevResults.size}`)
console.log(`Already done in progress: ${Object.keys(progressData.completed).length}`)
console.log(`Need to fetch (sync=true): ${needToFetch.length}`)
console.log(`Concurrency: ${CONCURRENCY}`)
console.log(`Estimated time: ${Math.ceil(needToFetch.length / CONCURRENCY * 20 / 60)} minutes`)
console.log('---')

let completed = 0
let fetched = 0
let errors = 0

async function fetchHashtag(hashtag) {
  const url = `${API_BASE}?hashtag=${encodeURIComponent(hashtag)}&tab=popular&sync=true`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000)

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeout)
      if (!res.ok) {
        if (attempt < 2) { await sleep(3000); continue }
        return { hashtag, post_count: null, error: `HTTP ${res.status}` }
      }
      const data = await res.json()
      return { hashtag, post_count: data.post_count ?? null, result: data.result, error: null }
    } catch (e) {
      clearTimeout(timeout)
      if (attempt < 2) { await sleep(3000); continue }
      return { hashtag, post_count: null, error: e.message }
    }
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function processBatch(batch) {
  return Promise.all(batch.map(async (hashtag) => {
    const result = await fetchHashtag(hashtag)
    completed++
    fetched++
    if (result.error) errors++

    progressData.completed[hashtag] = result.post_count

    if (fetched % 50 === 0 || fetched === needToFetch.length) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(progressData), 'utf-8')
    }

    if (fetched % 100 === 0 || fetched === needToFetch.length) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (fetched / (elapsed || 1)).toFixed(1)
      const remaining = Math.ceil((needToFetch.length - fetched) / (rate || 1) / 60)
      console.log(`[${new Date().toLocaleTimeString()}] ${fetched}/${needToFetch.length} fetched (errors: ${errors}) | ${rate}/s | ~${remaining}min left`)
    }
    return result
  }))
}

const startTime = Date.now()

async function main() {
  for (let i = 0; i < needToFetch.length; i += CONCURRENCY) {
    const batch = needToFetch.slice(i, i + CONCURRENCY)
    await processBatch(batch)
  }

  writeFileSync(PROGRESS_FILE, JSON.stringify(progressData), 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\nFetch complete in ${elapsed} minutes. Fetched: ${fetched}, Errors: ${errors}`)

  const finalResults = []
  for (const h of allHashtags) {
    let pc = null
    if (prevResults.has(h)) {
      pc = prevResults.get(h)
    } else if (progressData.completed[h] !== undefined && progressData.completed[h] !== null) {
      pc = progressData.completed[h]
    }
    finalResults.push({ hashtag: h, post_count: pc })
  }

  const csvHeader = 'hashtag,post_count\n'
  const csvRows = finalResults
    .map(r => `${r.hashtag},${r.post_count ?? ''}`)
    .join('\n')
  writeFileSync(OUTPUT_FILE, '\uFEFF' + csvHeader + csvRows, 'utf-8')

  const withData = finalResults.filter(r => r.post_count !== null && r.post_count > 0)
  const noData = finalResults.filter(r => r.post_count === null || r.post_count === 0)
  console.log(`\nFinal results: ${finalResults.length} total`)
  console.log(`  With post count: ${withData.length}`)
  console.log(`  No data (truly doesn't exist): ${noData.length}`)
  console.log(`Saved to: ${OUTPUT_FILE}`)

  const filtered = finalResults
    .filter(r => r.post_count !== null && r.post_count >= 10000)
    .sort((a, b) => b.post_count - a.post_count)
  const filteredCsv = 'hashtag,post_count\n' +
    filtered.map(r => `${r.hashtag},${r.post_count}`).join('\n')
  writeFileSync(FILTERED_FILE, '\uFEFF' + filteredCsv, 'utf-8')
  console.log(`Filtered (10,000+): ${filtered.length} hashtags saved to: ${FILTERED_FILE}`)

  console.log('\n=== Top 30 by post count ===')
  filtered.slice(0, 30).forEach((r, i) => {
    console.log(`${i + 1}. #${r.hashtag} → ${r.post_count.toLocaleString()}`)
  })

  console.log('\n=== DONE ===')
}

main().catch(console.error)
