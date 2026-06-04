import { readFileSync, writeFileSync, existsSync } from 'fs'

const API_BASE = 'https://ig-parser.decago.co.kr/api/instagram/v3/hashtag'
const CONCURRENCY = 8
const MAX_RETRIES = 5
const RETRY_DELAY = 5000
const TIMEOUT = 120000
const INPUT_FILE = '/Users/go/Downloads/일본 세수코 해시태그 26.2.26.txt'
const PROGRESS_FILE = '/Users/go/Desktop/hashtag_progress.json'
const OUTPUT_FILE = '/Users/go/Desktop/hashtag_results_final.csv'
const FILTERED_FILE = '/Users/go/Desktop/hashtag_10000plus_final.csv'
const RETRY_PROGRESS_FILE = '/Users/go/Desktop/hashtag_retry_progress.json'

const allHashtags = readFileSync(INPUT_FILE, 'utf-8')
  .split('\n').map(s => s.trim()).filter(s => s.length > 0)

const progressData = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))

let retryProgress = {}
if (existsSync(RETRY_PROGRESS_FILE)) {
  try {
    retryProgress = JSON.parse(readFileSync(RETRY_PROGRESS_FILE, 'utf-8'))
    console.log(`Retry progress loaded: ${Object.keys(retryProgress).length} already retried`)
  } catch {}
}

const nullHashtags = Object.entries(progressData.completed)
  .filter(([k, v]) => v === null)
  .map(([k]) => k)
  .filter(k => retryProgress[k] === undefined)

console.log(`Total null hashtags: ${Object.entries(progressData.completed).filter(([,v]) => v === null).length}`)
console.log(`Already retried: ${Object.keys(retryProgress).length}`)
console.log(`Remaining to retry: ${nullHashtags.length}`)
console.log(`Concurrency: ${CONCURRENCY}, Max retries: ${MAX_RETRIES}`)
console.log(`Estimated time: ~${Math.ceil(nullHashtags.length / CONCURRENCY * 25 / 60)} minutes`)
console.log('---')

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchHashtag(hashtag) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT)
    try {
      const url = `${API_BASE}?hashtag=${encodeURIComponent(hashtag)}&tab=popular&sync=true`
      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timer)
      if (!res.ok) {
        if (attempt < MAX_RETRIES - 1) { await sleep(RETRY_DELAY * (attempt + 1)); continue }
        return { hashtag, post_count: null }
      }
      const data = await res.json()
      if (data.result === 1 && data.post_count != null) {
        return { hashtag, post_count: data.post_count }
      }
      if (data.result === -2) {
        return { hashtag, post_count: 0 }
      }
      if (attempt < MAX_RETRIES - 1) { await sleep(RETRY_DELAY * (attempt + 1)); continue }
      return { hashtag, post_count: null }
    } catch (e) {
      clearTimeout(timer)
      if (attempt < MAX_RETRIES - 1) { await sleep(RETRY_DELAY * (attempt + 1)); continue }
      return { hashtag, post_count: null }
    }
  }
}

let completed = 0
let recovered = 0
let stillNull = 0
const startTime = Date.now()

async function processBatch(batch) {
  return Promise.all(batch.map(async (hashtag) => {
    const result = await fetchHashtag(hashtag)
    completed++

    retryProgress[hashtag] = result.post_count
    if (result.post_count !== null && result.post_count > 0) {
      recovered++
      progressData.completed[hashtag] = result.post_count
    } else if (result.post_count === 0) {
      progressData.completed[hashtag] = 0
    } else {
      stillNull++
    }

    if (completed % 25 === 0 || completed === nullHashtags.length) {
      writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(retryProgress), 'utf-8')
      writeFileSync(PROGRESS_FILE, JSON.stringify(progressData), 'utf-8')
    }

    if (completed % 100 === 0 || completed === nullHashtags.length) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = (completed / elapsed).toFixed(2)
      const remaining = Math.ceil((nullHashtags.length - completed) / (parseFloat(rate) || 0.01) / 60)
      console.log(`[${new Date().toLocaleTimeString()}] ${completed}/${nullHashtags.length} | recovered: ${recovered} | still empty: ${stillNull} | ${rate}/s | ~${remaining}min left`)
    }
    return result
  }))
}

async function main() {
  for (let i = 0; i < nullHashtags.length; i += CONCURRENCY) {
    const batch = nullHashtags.slice(i, i + CONCURRENCY)
    await processBatch(batch)
  }

  writeFileSync(RETRY_PROGRESS_FILE, JSON.stringify(retryProgress), 'utf-8')
  writeFileSync(PROGRESS_FILE, JSON.stringify(progressData), 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  console.log(`\nRetry complete in ${elapsed} minutes`)
  console.log(`Recovered: ${recovered}, Still empty: ${stillNull}`)

  const finalResults = []
  for (const h of allHashtags) {
    const pc = progressData.completed[h]
    finalResults.push({ hashtag: h, post_count: (pc !== null && pc !== undefined && pc > 0) ? pc : null })
  }

  const csvHeader = 'hashtag,post_count\n'
  const csvRows = finalResults.map(r => `${r.hashtag},${r.post_count ?? ''}`).join('\n')
  writeFileSync(OUTPUT_FILE, '\uFEFF' + csvHeader + csvRows, 'utf-8')

  const withData = finalResults.filter(r => r.post_count !== null)
  const noData = finalResults.filter(r => r.post_count === null)
  console.log(`\nFinal: ${withData.length} with data, ${noData.length} truly empty`)
  console.log(`Saved to: ${OUTPUT_FILE}`)

  const filtered = finalResults
    .filter(r => r.post_count !== null && r.post_count >= 10000)
    .sort((a, b) => b.post_count - a.post_count)
  const filteredCsv = 'hashtag,post_count\n' + filtered.map(r => `${r.hashtag},${r.post_count}`).join('\n')
  writeFileSync(FILTERED_FILE, '\uFEFF' + filteredCsv, 'utf-8')
  console.log(`Filtered (10,000+): ${filtered.length} hashtags → ${FILTERED_FILE}`)

  console.log('\n=== DONE ===')
}

main().catch(console.error)
