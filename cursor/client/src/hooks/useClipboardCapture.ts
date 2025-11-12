import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

export type ClipboardFeedback = { type: 'success' | 'error'; message: string } | null

interface CopyOptions {
  successMessage?: string
  errorMessage?: string
  waitForFonts?: boolean
  fileName?: string
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function captureElementAsBlob(
  element: HTMLElement,
  options: CopyOptions
): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default

  const images = Array.from(element.querySelectorAll('img'))
  const originals: Array<{ element: HTMLImageElement; src: string }> = []

  try {
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

    await delay(500)
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

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert canvas to blob'))
          }
        },
        'image/png',
        1
      )
    })
  } finally {
    originals.forEach(({ element: imgElement, src }) => {
      imgElement.src = src
    })
  }
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

  const clearLater = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      setFeedback(null)
    }, 3000)
  }

  const showFeedback = (type: 'success' | 'error', message?: string) => {
    if (!message) return
    setFeedback({ type, message })
    clearLater()
  }

  const copyToClipboard = async (
    element: HTMLElement | null,
    options: CopyOptions = {}
  ) => {
    if (!element) return

    const successMessage = options.successMessage || defaultMessages.success
    const errorMessage = options.errorMessage || defaultMessages.error

    try {
      const blob = await captureElementAsBlob(element, options)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      showFeedback('success', successMessage)
    } catch (error) {
      console.error('Failed to capture element or copy to clipboard:', error)
      showFeedback('error', errorMessage)
    }
  }

  const downloadAsImage = async (
    element: HTMLElement | null,
    options: CopyOptions = {}
  ) => {
    if (!element) return

    const errorMessage = options.errorMessage || defaultMessages.error

    try {
      const blob = await captureElementAsBlob(element, options)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')

      const baseName =
        options.fileName ||
        `report_${new Date().toISOString().split('T')[0]}`

      link.href = url
      link.download = `${baseName}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      if (options.successMessage) {
        showFeedback('success', options.successMessage)
      }
    } catch (error) {
      console.error('Failed to download element as image:', error)
      showFeedback('error', errorMessage)
    }
  }

  return {
    copyFeedback: feedback,
    copyToClipboard,
    downloadAsImage,
  }
}


