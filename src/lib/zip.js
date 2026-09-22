/**
 * A minimal ZIP writer — store method only (no compression), which is all a
 * handful of small PNGs and a manifest need. No dependency: the project has
 * none installed, and a real ZIP reader (every OS's, every browser's) only
 * needs the three structures this writes — local file headers, central
 * directory headers, and the end-of-central-directory record — to open it.
 */

function crc32(bytes) {
  let c
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n += 1) {
      c = n
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      t[n] = c >>> 0
    }
    return t
  })())
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i += 1) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function u16(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff])
}

function u32(n) {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >>> 24) & 0xff])
}

/** MS-DOS date/time, fixed rather than "now": a reproducible zip is a testable one. */
const DOS_TIME = u16(0)
const DOS_DATE = u16((1 << 9) | (1 << 5) | 1) // 1980-01-01

function concat(chunks) {
  const size = chunks.reduce((n, c) => n + c.length, 0)
  const out = new Uint8Array(size)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

/**
 * @param files [{ name: 'favicon.png', data: Uint8Array | ArrayBuffer }]
 * @returns a Blob, ready to download
 */
export function buildZip(files) {
  const encoder = new TextEncoder()
  const localParts = []
  const centralParts = []
  let offset = 0

  for (const { name, data } of files) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)
    const nameBytes = encoder.encode(name)
    const crc = crc32(bytes)

    const local = concat([
      u32(0x04034b50),
      u16(20), // version needed
      u16(0), // flags
      u16(0), // method: stored
      DOS_TIME,
      DOS_DATE,
      u32(crc),
      u32(bytes.length), // compressed size == uncompressed, stored
      u32(bytes.length),
      u16(nameBytes.length),
      u16(0), // extra field length
      nameBytes,
    ])
    localParts.push(local, bytes)

    const central = concat([
      u32(0x02014b50),
      u16(20), // version made by
      u16(20), // version needed
      u16(0),
      u16(0),
      DOS_TIME,
      DOS_DATE,
      u32(crc),
      u32(bytes.length),
      u32(bytes.length),
      u16(nameBytes.length),
      u16(0), // extra
      u16(0), // comment
      u16(0), // disk number
      u16(0), // internal attrs
      u32(0), // external attrs
      u32(offset), // local header offset
      nameBytes,
    ])
    centralParts.push(central)
    offset += local.length + bytes.length
  }

  const centralStart = offset
  const central = concat(centralParts)
  const end = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(centralStart),
    u16(0), // comment length
  ])

  return new Blob([...localParts, central, end], { type: 'application/zip' })
}
