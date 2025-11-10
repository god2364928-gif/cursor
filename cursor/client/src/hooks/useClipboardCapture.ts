import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

export type ClipboardFeedback = { type: 'success' | 'error'; message: string } | null

interface CopyOptions {
  successMessage?: string
  errorMessage?: string
  waitForFonts?: boolean
}

export function useClipboardCapture(language: string) {
  const [feedback, setFeedback] = useState<ClipboardFeedback>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  const defaultMessages = {
    success: language === 'ja' ? 'クリップボードにコピーしました！' : '클립보드에 복사되었습니다!',
    error: language === 'ja' ? 'クリップボードへのコピーに失敗しました' : '클립보드 복사에 실패했습니다',
  }

  const copyToClipboard = async (
    element: HTMLElement | null,
    options: CopyOptions = {}
  ) => {
    if (!element) return

    const successMessage = options.successMessage || defaultMessages.success
    const errorMessage = options.errorMessage || defaultMessages.error

    try {
      const html2canvas = (await import('html2canvas')).default

      const images = Array.from(element.querySelectorAll('img'))
      const originals: Array<{ element: HTMLImageElement; src: string }> = []

      for (const img of images) {
        const originalSrc = img.src
        originals.push({ element: img, src: originalSrc })
        try {
          const response = await api.get<{ dataUrl?: string }>('/account-optimization/image-proxy', {
            params: { url: originalSrc },
          })
          if (response.data?.dataUrl) {
            img.src = response.data.dataUrl
          }
        } catch (proxyError) {
          console.warn('Image proxy failed, using original source', proxyError)
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
      if (options.waitForFonts !== false && 'fonts' in document && document.fonts.ready) {
        await document.fonts.ready
      }

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
        allowTaint: true,
      })

      originals.forEach(({ element: imgElement, src }) => {
        imgElement.src = src
      })

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setFeedback({ type: 'error', message: errorMessage })
          return
        }

        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setFeedback({ type: 'success', message: successMessage })
        } catch (clipboardError) {
          console.error('Clipboard copy failed:', clipboardError)
          setFeedback({ type: 'error', message: errorMessage })
        } finally {
          if (timerRef.current) {
            clearTimeout(timerRef.current)
          }
          timerRef.current = setTimeout(() => {
            setFeedback(null)
          }, 3000)
        }
      }, 'image/png')
    } catch (error) {
      console.error('Failed to capture element:', error)
      setFeedback({ type: 'error', message: errorMessage })
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        setFeedback(null)
      }, 3000)
    }
  }

  return {
    copyFeedback: feedback,
    copyToClipboard,
  }
}


