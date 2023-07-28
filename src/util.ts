import {pluck} from "ramda"
import Fuse from "fuse.js/dist/fuse.min.js"
import {Executor, Relays, Pool} from "paravel"

export const pool = new Pool()

export const getMeta = ({tags}): Record<string, string> => {
  const meta = {}

  for (const [k, v] of tags) {
    meta[k] = v
  }

  return meta
}

export const getExecutor = urls => new Executor(new Relays(urls.map(url => pool.get(url))))

export const fromHex = hex => Uint8Array.from(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))

export const toHex = bytes =>
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "")

export const now = (drift = 0) => {
  const t = Math.round(Date.now() / 1000)
  const factor = Math.pow(10, drift)
  const offset = factor - Math.round(factor * Math.random()) * 2

  return t + offset
}

export const fuzzy = <T>(data: T[], opts = {}) => {
  const fuse = new Fuse(data, opts) as any

  // Slice pattern because the docs warn that it"ll crash if too long
  return (q: string) => {
    return q ? pluck("item", fuse.search(q.slice(0, 32)) as any[]) : data
  }
}
