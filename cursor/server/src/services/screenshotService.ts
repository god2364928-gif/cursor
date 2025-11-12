export async function generateScreenshot(): Promise<Buffer> {
  throw new Error('Screenshot generation is disabled in this environment.')
}