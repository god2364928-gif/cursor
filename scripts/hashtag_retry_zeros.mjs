import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs'

const API_BASE = 'https://ig-parser.decago.co.kr/api/instagram/v3/hashtag'
const CONCURRENCY = 5
const MAX_RETRIES = 5
const RETRY_DELAY = 6000
const TIMEOUT = 120000
const INPUT_CSV = '/Users/go/Desktop/hashtag_results_final.csv'
const OUTPUT_FILE = '/Users/go/Desktop/hashtag_results_final.csv'
const FILTERED_FILE = '/Users/go/Desktop/hashtag_10000plus_final.csv'
const PROGRESS_FILE = '/Users/go/Desktop/hashtag_retry3_progress.json'
const LOG_FILE = '/Users/go/Desktop/hashtag_retry3_log.txt'

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n', 'utf-8')
}

const allRows = []
const retryTargets = []
const csvContent = readFileSync(INPUT_CSV, 'utf-8').replace(/^\uFEFF/, '')
const lines = csvContent.split('\n')
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim()
  if (!line) continue
  const commaIdx = line.lastIndexOf(',')
  const hashtag = line.substring(0, commaIdx)
  const postCount = line.substring(commaIdx + 1).trim()
  allRows.push({ hashtag, post_count: postCount })
  if (!postCount || postCount === '0' || postCount === 'null') {
    retryTargets.push(hashtag)
  }
}

let retryProgress = {}
if (existsSync(PROGRESS_FILE)) {
  try {
    retryProgress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
    log(`이전 진행 상황 로드: ${Object.keys(retryProgress).length}개 처리됨`)
  } catch {}
}

const needToFetch = retryTargets.filter(h => retryProgress[h] === undefined)

log(`전체 해시태그: ${allRows.length}개`)
log(`재조회 대상 (0 또는 빈값): ${retryTargets.length}개`)
log(`이미 재시도함: ${Object.keys(retryProgress).length}개`)
log(`남은 조회 대상: ${needToFetch.length}개`)
log(`동시 처리: ${CONCURRENCY}개, 최대 재시도: ${MAX_RETRIES}회`)
log('---')

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
        return { hashtag, post_count: null, status: 'http_error' }
      }
      const data = await res.json()
      if (data.result === 1 && data.post_count != null) {
        return { hashtag, post_count: data.post_count, status: 'found' }
      }
      if (data.result === -2) {
        return { hashtag, post_count: -2, status: 'not_on_instagram' }
      }
      if (attempt < MAX_RETRIES - 1) { await sleep(RETRY_DELAY * (attempt + 1)); continue }
      return { hashtag, post_count: null, status: 'api_error' }
    } catch (e) {
      clearTimeout(timer)
      if (attempt < MAX_RETRIES - 1) { await sleep(RETRY_DELAY * (attempt + 1)); continue }
      return { hashtag, post_count: null, status: 'timeout' }
    }
  }
}

let completed = 0
let recovered = 0
let confirmedNotFound = 0
let stillFailed = 0
const startTime = Date.now()

async function processBatch(batch) {
  return Promise.all(batch.map(async (hashtag) => {
    const result = await fetchHashtag(hashtag)
    completed++

    retryProgress[hashtag] = { post_count: result.post_count, status: result.status }

    if (result.status === 'found') {
      recovered++
    } else if (result.status === 'not_on_instagram') {
      confirmedNotFound++
    } else {
      stillFailed++
    }

    if (completed % 20 === 0 || completed === needToFetch.length) {
      writeFileSync(PROGRESS_FILE, JSON.stringify(retryProgress), 'utf-8')
    }

    if (completed % 50 === 0 || completed === needToFetch.length) {
      const elapsed = (Date.now() - startTime) / 1000
      const rate = (completed / elapsed).toFixed(2)
      const remaining = Math.ceil((needToFetch.length - completed) / (parseFloat(rate) || 0.01) / 60)
      log(`${completed}/${needToFetch.length} | 복구: ${recovered} | API에 없음: ${confirmedNotFound} | 실패: ${stillFailed} | ${rate}/s | ~${remaining}분 남음`)
    }
    return result
  }))
}

async function main() {
  for (let i = 0; i < needToFetch.length; i += CONCURRENCY) {
    const batch = needToFetch.slice(i, i + CONCURRENCY)
    await processBatch(batch)
    await sleep(1000)
  }

  writeFileSync(PROGRESS_FILE, JSON.stringify(retryProgress), 'utf-8')

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1)
  log(`\n재시도 완료: ${elapsed}분 소요`)
  log(`복구: ${recovered}, API에 없음: ${confirmedNotFound}, 실패: ${stillFailed}`)

  const resultMap = new Map()
  for (const [h, info] of Object.entries(retryProgress)) {
    resultMap.set(h, info)
  }

  const finalRows = allRows.map(r => {
    if ((!r.post_count || r.post_count === '0' || r.post_count === 'null') && resultMap.has(r.hashtag)) {
      const info = resultMap.get(r.hashtag)
      if (info.status === 'found' && info.post_count > 0) {
        return { hashtag: r.hashtag, post_count: String(info.post_count) }
      }
      if (info.status === 'not_on_instagram') {
        return { hashtag: r.hashtag, post_count: '' }
      }
    }
    return r
  })

  const csvHeader = 'hashtag,post_count\n'
  const csvBody = finalRows.map(r => `${r.hashtag},${r.post_count}`).join('\n')
  writeFileSync(OUTPUT_FILE, '\uFEFF' + csvHeader + csvBody, 'utf-8')

  const withData = finalRows.filter(r => r.post_count && r.post_count !== '0' && r.post_count !== 'null')
  const noData = finalRows.filter(r => !r.post_count || r.post_count === '0' || r.post_count === 'null')
  log(`\n최종: 데이터 있음 ${withData.length}개, 비어있음 ${noData.length}개`)
  log(`저장: ${OUTPUT_FILE}`)

  const filtered = finalRows
    .filter(r => {
      const n = parseInt(r.post_count, 10)
      return !isNaN(n) && n >= 10000
    })
    .sort((a, b) => parseInt(b.post_count, 10) - parseInt(a.post_count, 10))
  const filteredCsv = 'hashtag,post_count\n' + filtered.map(r => `${r.hashtag},${r.post_count}`).join('\n')
  writeFileSync(FILTERED_FILE, '\uFEFF' + filteredCsv, 'utf-8')
  log(`1만 이상: ${filtered.length}개 → ${FILTERED_FILE}`)

  log('\n=== 완료 ===')
}

main().catch(e => { log(`오류: ${e.message}`); process.exit(1) })
