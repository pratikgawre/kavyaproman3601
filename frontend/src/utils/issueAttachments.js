const EXTENSION_TO_MIME = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
  flac: 'audio/flac',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  xml: 'application/xml',
  md: 'text/markdown',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed'
}

function getAttachmentExtension(attachment, url = '') {
  const name = (attachment?.name || attachment?.originalFilename || '').toLowerCase()
  const fromName = (name.match(/\.([a-z0-9]+)$/) || [])[1] || ''
  const fromUrl = (() => {
    try {
      const clean = url.split('?')[0].split('#')[0]
      const match = clean.match(/\.([a-z0-9]+)$/i)
      return match ? match[1].toLowerCase() : ''
    } catch (error) {
      return ''
    }
  })()
  return fromName || fromUrl || (attachment?.format || '').toLowerCase()
}

export function getAttachmentName(attachment) {
  return attachment?.name || attachment?.originalFilename || 'attachment'
}

export function resolveAttachmentUrl(attachment) {
  const raw = attachment?.url || attachment?.fileUrl || attachment?.downloadUrl || attachment?.link || attachment?.href || attachment?.data || ''
  if (!raw) return ''

  if (attachment?.data && !/^(https?:|blob:|data:|\/\/)/i.test(raw)) {
    const mime = attachment?.type || 'application/octet-stream'
    return `data:${mime};base64,${raw}`
  }

  let url = raw
  const resourceType = (attachment?.resourceType || '').toString().trim().toLowerCase()
  const type = (attachment?.type || '').toString().trim().toLowerCase()
  const ext = getAttachmentExtension(attachment, url)
  const isImage =
    type.startsWith('image/') ||
    ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'].includes(ext)
  const isVideoAudio =
    type.startsWith('video/') ||
    type.startsWith('audio/') ||
    ['mp4', 'webm', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'm4a', 'ogg', 'flac'].includes(ext)

  if (typeof url === 'string') {
    if (resourceType === 'raw' && url.includes('/image/upload/')) {
      url = url.replace('/image/upload/', '/raw/upload/')
    } else if (resourceType === 'video' && url.includes('/image/upload/')) {
      url = url.replace('/image/upload/', '/video/upload/')
    } else if (!resourceType && url.includes('/image/upload/') && !isImage) {
      url = url.replace('/image/upload/', isVideoAudio ? '/video/upload/' : '/raw/upload/')
    }
  }

  return url
}

export function inferAttachmentMimeType(attachment, url = '') {
  const type = (attachment?.type || '').toLowerCase()
  if (type && type !== 'application/octet-stream') return type
  const ext = getAttachmentExtension(attachment, url)
  return EXTENSION_TO_MIME[ext] || ''
}

export function isPreviewableAttachmentMime(mime) {
  if (!mime) return false
  return (
    mime.startsWith('image/') ||
    mime.startsWith('video/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('text/') ||
    mime === 'application/pdf' ||
    mime === 'application/json' ||
    mime === 'application/xml'
  )
}

function triggerDownload(url, fileName) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export async function openIssueAttachment(attachment) {
  const href = resolveAttachmentUrl(attachment)
  if (!href) return

  const fileName = getAttachmentName(attachment)
  const inferredType = inferAttachmentMimeType(attachment, href)
  const shouldPreview = isPreviewableAttachmentMime(inferredType)

  try {
    const response = await fetch(href)
    if (!response.ok) throw new Error('Attachment fetch failed')

    const blob = await response.blob()
    const typedBlob = inferredType && inferredType !== blob.type
      ? blob.slice(0, blob.size, inferredType)
      : blob
    const finalMime = typedBlob.type || inferredType
    const blobUrl = URL.createObjectURL(typedBlob)

    if (isPreviewableAttachmentMime(finalMime)) {
      const previewWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer')
      if (!previewWindow) {
        window.location.href = blobUrl
      }
    } else {
      triggerDownload(blobUrl, fileName)
    }

    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch (error) {
    if (shouldPreview) {
      const previewWindow = window.open(href, '_blank', 'noopener,noreferrer')
      if (!previewWindow) {
        window.location.href = href
      }
      return
    }

    triggerDownload(href, fileName)
  }
}
