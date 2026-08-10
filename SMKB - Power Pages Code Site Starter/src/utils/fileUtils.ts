export interface NamedFile {
  name: string
  content: string // pure base64, no data-URL prefix
}

/** Naming rule for one upload field: filename prefix + whether multiple files are allowed. */
export interface FileFieldMeta {
  prefix: string
  multi: boolean
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // `(result as string).split(',')[1]` assumed both the cast and the comma. readAsDataURL can
      // hand back an ArrayBuffer-typed result or, for a zero-byte file, a URL with no payload -
      // and `[1]` is then `undefined`, which resolved the promise with undefined and sent the
      // literal string "undefined" to the flow as the file's content. Reject instead: a failed
      // read the caller can report beats a silently corrupt upload.
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error(`Could not read "${file.name}" as a data URL`))
        return
      }
      const base64 = result.split(',')[1]
      if (base64 === undefined) {
        reject(new Error(`"${file.name}" produced a data URL with no content`))
        return
      }
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function buildTimestamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/**
 * Spreadsheet-style label for the nth attachment: A..Z, then AA, AB, ... AZ, BA, ...
 *
 * `String.fromCharCode(65 + i)` was correct only up to 26 files: the 27th produced `[`, the
 * 28th `\\`, then `]`, `^`, `_`, `` ` `` - characters that are illegal or hostile in a
 * filename, silently, on an upload the user believed had succeeded. 26 is a plausible number of
 * attachments for a document-upload form, which is what makes this worth fixing rather than
 * capping.
 */
function attachmentLabel(i: number): string {
  let n = i
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/**
 * Converts a files map (field-key -> Ref<File[]> or File[]) into a flat array of
 * {name, content} objects ready to JSON-stringify and send to an upload flow.
 *
 * `meta` maps each field key to its naming rule; keys missing from `meta` are skipped.
 *
 * Naming: single-capable fields → `{Prefix}-{ts}.{ext}`
 *         multi-capable fields  → `{Prefix}-AttachmentA-{ts}.{ext}`, B, C …
 *
 * @example
 * const META: Record<string, FileFieldMeta> = {
 *   idCopy:  { prefix: 'Id',      multi: true  },
 *   invoice: { prefix: 'Invoice', multi: false },
 * }
 * const payload = await buildNamedFilePayload({ idCopy: idFiles }, META)
 * await invokeFlow(FLOWS.uploadDocuments, { files: JSON.stringify(payload) })
 */
export async function buildNamedFilePayload(
  files: Record<string, unknown>,
  meta: Record<string, FileFieldMeta>,
): Promise<NamedFile[]> {
  const ts = buildTimestamp()
  const result: NamedFile[] = []

  for (const [key, raw] of Object.entries(files)) {
    const arr: File[] = (raw as { value?: File[] })?.value ?? (raw as File[]) ?? []
    if (!arr.length) continue
    const fieldMeta = meta[key]
    if (!fieldMeta) continue

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i]
      // Explicit guard: with noUncheckedIndexedAccess this is required, and without it a sparse
      // array (or a mid-iteration mutation) reached `.name` on undefined.
      if (!file) continue
      // `split('.').pop() ?? 'bin'` never reached the fallback: for a dotless name pop() returns
      // the WHOLE name, so "invoice" was uploaded as "Invoice-<ts>.invoice". Require a real dot
      // with something after it.
      const dot = file.name.lastIndexOf('.')
      const ext = dot > 0 && dot < file.name.length - 1 ? file.name.slice(dot + 1) : 'bin'
      const letter = fieldMeta.multi ? `-Attachment${attachmentLabel(i)}` : ''
      result.push({
        name: `${fieldMeta.prefix}${letter}-${ts}.${ext}`,
        content: await fileToBase64(file),
      })
    }
  }

  return result
}
