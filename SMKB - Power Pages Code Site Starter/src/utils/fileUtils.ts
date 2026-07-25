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
    reader.onload = () => resolve((reader.result as string).split(',')[1])
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
 * Converts a files map (field-key → Ref<File[]> or File[]) into a flat array of
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
      const ext = arr[i].name.split('.').pop() ?? 'bin'
      const letter = fieldMeta.multi ? `-Attachment${String.fromCharCode(65 + i)}` : ''
      result.push({
        name: `${fieldMeta.prefix}${letter}-${ts}.${ext}`,
        content: await fileToBase64(arr[i]),
      })
    }
  }

  return result
}
