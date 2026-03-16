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
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(body.message || 'Upload failed')
  }
  return body
}

export async function uploadFiles(files, options) {
  const arr = Array.from(files || [])
  if (arr.length === 0) return []
  const results = await Promise.all(arr.map((file) => uploadFile(file, options)))
  return results
}
