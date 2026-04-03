import { outputJson, readJson, pathExists } from 'fs-extra/esm'
import chalk from 'chalk'
import Downloader from 'nodejs-file-downloader'
import ora from 'ora'
import PQueue from 'p-queue'
import throttledQueue from 'throttled-queue'
import { settings } from './config.mjs'

const throttle = throttledQueue(1, 1000)
const downloadQueue = settings.FILE_CONCURRENCY
  ? new PQueue({ concurrency: settings.FILE_CONCURRENCY })
  : null

export const log = (...args) => settings.VERBOSE && console.log(...args)
export const map = (array, mapper) => Promise.all(array.map(mapper))

const writeToCache = async (path, data) => {
  await outputJson(path, data, { spaces: 2 })
  log(path, chalk.green('cache written'))
}

const readFromCache = async path => {
  if (!settings.CACHE) {
    log(path, chalk.yellow('cache skipped'))
    return null
  }

  try {
    const data = await readJson(path)
    log(path, chalk.blue('cache hit'))
    return data
  } catch {
    log(path, chalk.red('cache miss'))
    return null
  }
}

export const readOrFetchData = async (path, fetcher) => {
  const cache = await readFromCache(path)
  if (cache) return cache

  const data = await throttle(fetcher)
  await writeToCache(path, data)

  return data
}

export const formatFileSize = bytes => {
  if (Math.abs(bytes) < 1024) return bytes + ' B'

  const units = ['Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb']
  let u = -1

  do {
    bytes /= 1024
    ++u
  } while (
    Math.round(Math.abs(bytes) * 10) / 10 >= 1024 &&
    u < units.length - 1
  )

  return bytes.toFixed(1) + ' ' + units[u]
}

export const downloadFile = async (url, path = '.') => {
  if (!url || !downloadQueue) return

  let fullPath = path

  const spinner = ora({ text: chalk.grey(fullPath), isSilent: !settings.VERBOSE })
  const downloader = new Downloader({
    url,
    directory: path,
    cloneFiles: false,
    onBeforeSave: async deducedName => {
      fullPath = path + '/' + deducedName

      if (settings.CACHE && (await pathExists(fullPath))) {
        downloader.cancel()
        log(fullPath, chalk.blue('cache hit'))
      } else {
        spinner.start()
        log(fullPath, chalk.red(settings.CACHE ? 'cache miss' : 'cache skipped'))
      }
    },
    onProgress: function (percentage, _, remainingBytes) {
      const remainingSize = formatFileSize(remainingBytes)
      const progress = `${percentage}% (${remainingSize} remaining)`
      spinner.text = chalk.grey(fullPath) + ' ' + chalk.blue(progress)
    },
  })

  try {
    await downloadQueue.add(() => downloader.download())
    spinner.stop()
    log(fullPath, chalk.green('download succeeded'))
  } catch (error) {
    if (error.code !== 'ERR_REQUEST_CANCELLED') {
      log(chalk.red(`Download failed for ${fullPath} (URL: ${url})`), error.code, error.statusCode)
    }
  }
}
