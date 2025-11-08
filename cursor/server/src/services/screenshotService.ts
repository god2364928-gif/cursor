import puppeteer from 'puppeteer'

export async function generateScreenshot(url: string): Promise<Buffer> {
  let browser = null
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    
    // Set viewport for consistent screenshots
    await page.setViewport({
      width: 1280,
      height: 1024,
      deviceScaleFactor: 2
    })

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    // Wait for content to be fully loaded
    await page.waitForSelector('[data-screenshot]', { timeout: 10000 })

    // Get the element to screenshot
    const element = await page.$('[data-screenshot]')
    if (!element) {
      throw new Error('Screenshot target element not found')
    }

    // Take screenshot of the specific element
    const screenshot = await element.screenshot({
      type: 'png',
      omitBackground: false
    })

    return screenshot as Buffer
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

