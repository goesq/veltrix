// Exports a scene to video, frame by frame: opens index.html in headless Chrome, calls
// window.draw(t) for each frame, screenshots it and pipes the PNGs into ffmpeg.
//
//   npm run render                                  -> launch, every format, English
//   npm run render -- --language pt                 -> Portuguese copy
//   npm run render -- --format vertical --fps 30
//   npm run render -- --frames 2.5,12.8             -> only those instants, as PNG (review)
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import ffmpegPath from 'ffmpeg-static'
import puppeteer from 'puppeteer-core'

const FORMATS = { vertical: [1080, 1920], horizontal: [1920, 1080], square: [1080, 1080] }
const here = path.dirname(fileURLToPath(import.meta.url))

const { values: options } = parseArgs({
  options: {
    scene: { type: 'string', default: 'launch' },
    format: { type: 'string', default: 'all' },
    language: { type: 'string', default: 'en' },
    fps: { type: 'string', default: '60' },
    frames: { type: 'string' },
  },
})

const fps = Number(options.fps)
const formats = options.format === 'all' ? Object.keys(FORMATS) : [options.format]
for (const format of formats) {
  if (!FORMATS[format]) throw new Error(`Unknown format "${format}" (${Object.keys(FORMATS).join(', ')} or all)`)
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].filter(Boolean)
  const found = candidates.find((candidate) => existsSync(candidate))
  if (!found) throw new Error('Chrome or Edge not found. Set CHROME_PATH to its executable.')
  return found
}

async function renderFormat(browser, format) {
  const [width, height] = FORMATS[format]
  const page = await browser.newPage()
  await page.setViewport({ width, height, deviceScaleFactor: 1 })
  page.on('pageerror', (error) => console.error(`[page] ${error.message}`))

  const url = new URL(pathToFileURL(path.join(here, 'index.html')))
  url.search = new URLSearchParams({ render: '1', scene: options.scene, format, language: options.language }).toString()
  await page.goto(url.href)
  await page.waitForFunction('window.ready === true', { timeout: 15_000 })
  const name = `${options.scene}-${format}-${options.language}`

  if (options.frames) {
    for (const t of options.frames.split(',').map(Number)) {
      await page.evaluate((instant) => window.draw(instant), t)
      const file = path.join(here, 'output', `${name}-${t.toFixed(2)}s.png`)
      writeFileSync(file, await page.screenshot({ type: 'png' }))
      console.log(`${format}: ${t.toFixed(2)} s -> ${path.relative(here, file)}`)
    }
    await page.close()
    return
  }

  const duration = await page.evaluate(() => window.scene.duration)
  const frames = Math.round(duration * fps)
  const output = path.join(here, 'output', `${name}.mp4`)
  const ffmpeg = spawn(
    ffmpegPath,
    ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  )
  const finished = new Promise((resolve, reject) =>
    ffmpeg.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))),
  )

  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.draw(t), i / fps)
    const png = await page.screenshot({ type: 'png' })
    if (!ffmpeg.stdin.write(png)) await new Promise((resolve) => ffmpeg.stdin.once('drain', resolve))
    if (process.stdout.isTTY) process.stdout.write(`\r${format}: frame ${i + 1}/${frames}`)
  }
  ffmpeg.stdin.end()
  await finished
  await page.close()
  console.log(`\n${format}: ${frames} frames -> ${path.relative(here, output)}`)
}

mkdirSync(path.join(here, 'output'), { recursive: true })
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--force-color-profile=srgb', '--hide-scrollbars', '--allow-file-access-from-files'],
})
try {
  for (const format of formats) await renderFormat(browser, format)
} finally {
  await browser.close()
}
