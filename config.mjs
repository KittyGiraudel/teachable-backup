import 'dotenv/config'

export const API_KEY = process.env.API_KEY
export const VERBOSE = Boolean(Number(process.env.VERBOSE ?? 1))
export const CACHE = Boolean(Number(process.env.CACHE ?? 1))
export const FILE_CONCURRENCY = Number(process.env.FILE_CONCURRENCY ?? 0)
export const CACHE_DIR = process.env.CACHE_DIR ?? '.dist'
