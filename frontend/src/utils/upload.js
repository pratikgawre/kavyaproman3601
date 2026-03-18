const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export async function uploadFile(file, { folder } = {}) {
  if (!file) throw new Error('No file provided')
  const form = new FormData()
  form.append('file', file)
  if (folder) form.append('folder', folder)

  const res = await fetch(`${API_BASE}/api/uploads`, {
    method: 'POST',
    body: form,
  })
  const text = await res.text().catch(() => '')
  let body = {}
  try { body = text ? JSON.parse(text) : {} } catch (e) { body = {} }
  if (!res.ok) {
    const message =
      body.message ||
      body.detail ||
      body.error ||
      (typeof text === 'string' && text.trim() ? text.trim() : '') ||
      'Upload failed'
    throw new Error(message)
  }
  return Object.keys(body).length ? body : (text ? { url: text } : {})
}

export async function uploadFiles(files, options) {
  const arr = Array.from(files || [])
  if (arr.length === 0) return []
  const results = await Promise.all(arr.map((file) => uploadFile(file, options)))
  return results
}
