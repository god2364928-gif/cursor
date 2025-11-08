"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScreenshot = generateScreenshot;
const puppeteer_1 = __importDefault(require("puppeteer"));
async function generateScreenshot(url) {
    let browser = null;
    try {
        browser = await puppeteer_1.default.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu'
            ]
        });
        const page = await browser.newPage();
        // Set viewport for consistent screenshots
        await page.setViewport({
            width: 1280,
            height: 1024,
            deviceScaleFactor: 2
        });
        // Navigate to the URL
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });
        // Wait for content to be fully loaded
        await page.waitForSelector('[data-screenshot]', { timeout: 10000 });
        // Get the element to screenshot
        const element = await page.$('[data-screenshot]');
        if (!element) {
            throw new Error('Screenshot target element not found');
        }
        // Take screenshot of the specific element
        const screenshot = await element.screenshot({
            type: 'png',
            omitBackground: false
        });
        return screenshot;
    }
    finally {
        if (browser) {
            await browser.close();
        }
    }
}
//# sourceMappingURL=screenshotService.js.map