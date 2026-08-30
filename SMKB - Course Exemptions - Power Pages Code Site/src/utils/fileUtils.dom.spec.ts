// `.dom.spec.ts` -> jsdom: buildNamedFilePayload reads files through FileReader.
import { describe, it, expect } from 'vitest'
import { buildNamedFilePayload, type FileFieldMeta } from './fileUtils'

const META: Record<string, FileFieldMeta> = {
  idCopy: { prefix: 'Id', multi: true },
  invoice: { prefix: 'Invoice', multi: false },
}

const file = (name: string, content = 'x') =>
  new File([content], name, { type: 'application/octet-stream' })

/** Strip the `-<timestamp>` segment so assertions do not depend on the clock. */
const shape = (n: string) => n.replace(/-\d{8}-\d{6}(?=\.)/, '-TS')

describe('buildNamedFilePayload', () => {
  it('names a single-capable field without an attachment letter', async () => {
    const out = await buildNamedFilePayload({ invoice: [file('receipt.pdf')] }, META)
    expect(out.map((f) => shape(f.name))).toEqual(['Invoice-TS.pdf'])
  })

  it('labels a multi-capable field A, B, C ...', async () => {
    const out = await buildNamedFilePayload(
      { idCopy: [file('a.png'), file('b.png'), file('c.png')] },
      META,
    )
    expect(out.map((f) => shape(f.name))).toEqual([
      'Id-AttachmentA-TS.png', 'Id-AttachmentB-TS.png', 'Id-AttachmentC-TS.png',
    ])
  })

  // THE bug this covers. `String.fromCharCode(65 + i)` ran off the end of the alphabet: the 27th
  // file was named `-Attachment[`, the 28th `-Attachment\`, then `]`, `^`, `_`, `` ` `` -
  // characters that are illegal or hostile in a filename, produced silently on an upload the user
  // believed had succeeded. 27 attachments is an ordinary number for a document-upload form.
  it('keeps producing legal labels past the 26th file (AA, AB, ... not "[")', async () => {
    const files = Array.from({ length: 30 }, (_, i) => file(`f${i}.png`))
    const out = await buildNamedFilePayload({ idCopy: files }, META)
    const labels = out.map((f) => f.name.match(/-Attachment([^-]+)-/)?.[1])
    expect(labels[25]).toBe('Z')
    expect(labels[26]).toBe('AA')
    expect(labels[27]).toBe('AB')
    expect(labels[29]).toBe('AD')
    // The real invariant: nothing outside A-Z ever appears in a label.
    for (const l of labels) expect(l).toMatch(/^[A-Z]+$/)
  })

  it('accepts a ref-like { value: File[] } as well as a bare array', async () => {
    const out = await buildNamedFilePayload({ invoice: { value: [file('r.pdf')] } }, META)
    expect(out).toHaveLength(1)
  })

  it('skips a field with no meta entry, and a field with no files', async () => {
    const out = await buildNamedFilePayload(
      { unknownField: [file('x.pdf')], invoice: [] },
      META,
    )
    expect(out).toEqual([])
  })

  // `split('.').pop() ?? 'bin'` looked like it handled this and did not: for a dotless name pop()
  // returns the whole name, so "invoice" became "Invoice-<ts>.invoice" and the documented `bin`
  // fallback was unreachable. Same for a trailing dot and a dotfile.
  it.each([
    ['noextension', 'Invoice-TS.bin'],
    ['trailingdot.', 'Invoice-TS.bin'],
    ['.gitignore', 'Invoice-TS.bin'],
    ['archive.tar.gz', 'Invoice-TS.gz'],
  ])('names %s as %s', async (given, expected) => {
    const out = await buildNamedFilePayload({ invoice: [file(given)] }, META)
    expect(shape(out[0]!.name)).toBe(expected)
  })

  it('returns pure base64 with no data-URL prefix', async () => {
    const out = await buildNamedFilePayload({ invoice: [file('r.txt', 'hello')] }, META)
    expect(out[0]!.content).toBe(btoa('hello'))
    expect(out[0]!.content).not.toContain('base64,')
  })
})
