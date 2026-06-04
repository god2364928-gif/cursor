import { readFileSync, writeFileSync } from 'fs'

const API_BASE = 'https://ig-parser.decago.co.kr/api/instagram/v3/hashtag'
const CONCURRENCY = 10
const INPUT_FILE = '/Users/go/Downloads/일본 세수코 해시태그 26.2.26.txt'
const OUTPUT_FILE = '/Users/go/Desktop/hashtag_results.csv'
const FILTERED_FILE = '/Users/go/Desktop/hashtag_10000plus.csv'

const hashtags = readFileSync(INPUT_FILE, 'utf-8')
  .split('\n')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log(`Total hashtags: ${hashtags.length}`)

const results = []
let completed = 0
let errors = 0

async function fetchHashtag(hashtag) {
  const url = `${API_BASE}?hashtag=${encodeURIComponent(hashtag)}&tab=popular&sync=false`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) {
      return { hashtag, post_count: null, error: `HTTP ${res.status}` }
    }
    const data = await res.json()
    return { hashtag, post_count: data.post_count ?? null, error: null }
  } catch (e) {
    clearTimeout(timeout)
    return { hashtag, post_count: null, error: e.message }
  }
}

async function processBatch(batch) {
  return Promise.all(batch.map(async (hashtag) => {
    const result = await fetchHashtag(hashtag)
    completed++
    if (result.error) errors++
    if (completed % 100 === 0 || completed === hashtags.length) {
      console.log(`Progress: ${completed}/${hashtags.length} (errors: ${errors})`)
    }
    return result
  }))
}

async function main() {
  const startTime = Date.now()

  for (let i = 0; i < hashtags.length; i += CONCURRENCY) {
    const batch = hashtags.slice(i, i + CONCURRENCY)
    const batchResults = await processBatch(batch)
    results.push(...batchResults)
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\nDone in ${elapsed}s. Total: ${results.length}, Errors: ${errors}`)

  const csvHeader = 'hashtag,post_count,error\n'
  const csvRows = results
    .map(r => `${r.hashtag},${r.post_count ?? ''},${r.error ?? ''}`)
    .join('\n')
  writeFileSync(OUTPUT_FILE, '\uFEFF' + csvHeader + csvRows, 'utf-8')
  console.log(`All results saved to: ${OUTPUT_FILE}`)

  const filtered = results
    .filter(r => r.post_count !== null && r.post_count >= 10000)
    .sort((a, b) => b.post_count - a.post_count)
  const filteredCsv = 'hashtag,post_count\n' +
    filtered.map(r => `${r.hashtag},${r.post_count}`).join('\n')
  writeFileSync(FILTERED_FILE, '\uFEFF' + filteredCsv, 'utf-8')
  console.log(`Filtered (10,000+): ${filtered.length} hashtags saved to: ${FILTERED_FILE}`)

  console.log('\n=== Top 20 by post count ===')
  filtered.slice(0, 20).forEach((r, i) => {
    console.log(`${i + 1}. #${r.hashtag} → ${r.post_count.toLocaleString()}`)
  })
}

main().catch(console.error)
