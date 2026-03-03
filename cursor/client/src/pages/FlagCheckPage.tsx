import { useState } from 'react'
import { useI18nStore } from '../i18n'
import api from '../lib/api'
import { Search, ShieldCheck, ShieldOff, ShieldQuestion, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

type FlagState = true | false | null

interface FlagResult {
  username: string
  spam_follower_setting_enabled: FlagState
}

export default function FlagCheckPage() {
  const { t } = useI18nStore()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<FlagResult | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = username.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await api.get('/flag-check', { params: { username: trimmed } })
      setResult(response.data)
    } catch {
      setError(t('flagCheckError'))
    } finally {
      setLoading(false)
    }
  }

  const getFlagDisplay = (flag: FlagState) => {
    if (flag === true) {
      return {
        icon: <ShieldCheck className="h-16 w-16 text-orange-500" />,
        label: t('flagCheckOn'),
        desc: t('flagCheckOnDesc'),
        badgeClass: 'bg-orange-100 text-orange-700 border border-orange-300',
        cardClass: 'border-orange-300 bg-orange-50/60',
        descClass: 'bg-orange-100 border border-orange-300 text-orange-800 font-semibold text-base px-5 py-3 rounded-xl',
      }
    }
    if (flag === false) {
      return {
        icon: <ShieldOff className="h-16 w-16 text-blue-500" />,
        label: t('flagCheckOff'),
        desc: t('flagCheckOffDesc'),
        badgeClass: 'bg-blue-100 text-blue-700 border border-blue-300',
        cardClass: 'border-blue-300 bg-blue-50/60',
        descClass: 'bg-blue-100 border border-blue-300 text-blue-800 font-semibold text-base px-5 py-3 rounded-xl',
      }
    }
    return {
      icon: <ShieldQuestion className="h-16 w-16 text-gray-400" />,
      label: t('flagCheckUnknown'),
      desc: t('flagCheckUnknownDesc'),
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-200',
      cardClass: 'border-gray-200 bg-gray-50/40',
      descClass: 'text-sm text-gray-500',
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 space-y-6 max-w-2xl mx-auto">
      {/* 헤더 */}
      <Card className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-md">
        <CardContent className="p-6">
          <h1 className="text-2xl font-bold">{t('flagCheckTitle')}</h1>
          <p className="mt-1 text-violet-100 text-sm">{t('flagCheckSubtitle')}</p>
        </CardContent>
      </Card>

      {/* 입력 폼 */}
      <Card className="bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-gray-700">
            {t('flagCheckInputLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('flagCheckPlaceholder')}
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !username.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('flagCheckSearching')}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  {t('flagCheckSearch')}
                </>
              )}
            </Button>
          </form>
          <p className="mt-2 text-xs text-gray-400">{t('flagCheckHint')}</p>
        </CardContent>
      </Card>

      {/* 오류 */}
      {error && (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {/* 결과 */}
      {result && (() => {
        const display = getFlagDisplay(result.spam_follower_setting_enabled)
        return (
          <Card className={`shadow-sm ${display.cardClass}`}>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <p className="text-sm text-gray-500">
                  @<span className="font-semibold text-gray-800">{result.username}</span>
                </p>
                {display.icon}
                <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${display.badgeClass}`}>
                  {display.label}
                </span>
                <p className={display.descClass}>{display.desc}</p>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* 초기 안내 */}
      {!result && !error && !loading && (
        <Card className="bg-white shadow-sm border-dashed border-gray-200">
          <CardContent className="p-8 flex flex-col items-center gap-2 text-gray-400">
            <ShieldQuestion className="h-10 w-10" />
            <p className="text-sm">{t('flagCheckEmptyTitle')}</p>
            <p className="text-xs">{t('flagCheckEmptyDesc')}</p>
          </CardContent>
        </Card>
      )}

      {/* 플래그 OFF 가이드 */}
      <Card className="bg-white shadow-sm">
        <button
          className="w-full flex items-center justify-between px-5 py-4 text-left"
          onClick={() => setGuideOpen((v) => !v)}
        >
          <span className="font-semibold text-gray-700 text-sm">{t('flagCheckGuideTitle')}</span>
          {guideOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>

        {guideOpen && (
          <CardContent className="pt-0 pb-5 px-5 space-y-5">
            {/* STEP 1 */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-violet-700">{t('flagCheckGuideStep1Title')}</p>
              <p className="text-xs text-gray-500">{t('flagCheckGuideStep1Desc')}</p>
              <img
                src="/guide/flag-step1.png"
                alt="step1"
                className="rounded-xl border border-gray-200 w-full max-w-xs mx-auto block"
              />
            </div>

            {/* STEP 2 */}
            <div className="space-y-2">
              <p className="text-sm font-bold text-violet-700">{t('flagCheckGuideStep2Title')}</p>
              <p className="text-xs text-gray-500">{t('flagCheckGuideStep2Desc')}</p>
              <img
                src="/guide/flag-step2.png"
                alt="step2"
                className="rounded-xl border border-gray-200 w-full max-w-xs mx-auto block"
              />
            </div>

          </CardContent>
        )}
      </Card>
    </div>
  )
}
