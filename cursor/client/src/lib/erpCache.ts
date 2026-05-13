// ERP 페이지 탭 전환 시 데이터 깜빡임 방지를 위한 모듈 레벨 캐시.
// 라우팅으로 컴포넌트가 언마운트돼도 모듈 상태는 유지되므로,
// 재방문 시 useState 초기값으로 즉시 표시 후 백그라운드에서 새로 fetch한다.

type Cache<T> = Map<string, T>

const stores = new Map<string, Cache<unknown>>()

function getStore<T>(namespace: string): Cache<T> {
  let s = stores.get(namespace)
  if (!s) {
    s = new Map()
    stores.set(namespace, s)
  }
  return s as Cache<T>
}

export function readCache<T>(namespace: string, key: string = '_'): T | undefined {
  return getStore<T>(namespace).get(key)
}

export function writeCache<T>(namespace: string, key: string, value: T): void {
  getStore<T>(namespace).set(key, value)
}

export function clearCache(namespace?: string): void {
  if (namespace) stores.delete(namespace)
  else stores.clear()
}
