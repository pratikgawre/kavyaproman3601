export function getInitials(name, email) {
  const trimmed = (name || '').trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U'
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
  }

  const emailPart = (email || '').split('@')[0].trim()
  if (emailPart) {
    const cleaned = emailPart.replace(/[^A-Za-z0-9]/g, ' ')
    const parts = cleaned.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return emailPart[0]?.toUpperCase() || 'U'
  }

  return 'U'
}
