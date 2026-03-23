import React from 'react'
import { FiX } from 'react-icons/fi'
import { getInitials } from '../utils/initials'
import { openIssueAttachment, resolveAttachmentUrl } from '../utils/issueAttachments'

export default function IssueDetailModal({ issue, onClose }){
  if(!issue) return null

  const getRoleColor = (role) => {
    if (!role) return '#94a3b8'
    const normalized = (role || '').toString().toLowerCase()
    if (normalized.includes('tester')) return '#10b981'
    if (normalized.includes('report') || normalized.includes('creator') || normalized.includes('reporter')) return '#2563eb'
    if (normalized.includes('admin') || normalized.includes('manager')) return '#7c3aed'
    if (normalized.includes('developer') || normalized.includes('dev')) return '#8b5cf6'
    return '#64748b'
  }

  const getRoleLabel = (role) => (
    (() => {
      const normalized = (role || '').toString().trim().toLowerCase()
      if (!normalized) return ''
      if (normalized === 'admin' || normalized === 'project manager') return 'Project Manager'
      if (normalized === 'developer') return 'Developer'
      if (normalized === 'tester') return 'Tester'
      return (role || '')
        .toString()
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ')
    })()
  )

  const getRoleBadgeStyle = (role) => {
    const color = getRoleColor(role)
    return {
      background: `${color}14`,
      color,
      border: `1px solid ${color}26`
    }
  }

  const reporterName = issue.reporterName || issue.creatorName || issue.assignedBy || issue.assignee || ''
  const reporterRole = getRoleLabel(issue.reporterRole || issue.creatorRole || issue.userRole || '')
  const reporterAvatar = issue.reporterAvatar || issue.reporterPhoto || issue.creatorAvatar || issue.avatar || issue.assigneeAvatar || ''

  return (
    <div className="board-comment-overlay" onClick={onClose}>
      <div className="board-comment-modal" onClick={(e)=>e.stopPropagation()} style={{width:'min(840px,96vw)'}}>
        <div className="board-comment-header issue-detail-header">
          <div className="issue-header-left">
            {reporterAvatar ? (
              <img src={reporterAvatar} alt={reporterName || 'User'} className="issue-avatar" />
            ) : (
              <div className="issue-avatar issue-avatar-initials">{getInitials(reporterName || issue.reportedBy || issue.assignedBy || '')}</div>
            )}
          </div>

          <div style={{flex:1}}>
            <h3 style={{margin:0}}>{issue.displayKey || issue.id || issue.issueKey || ''} &middot; {issue.title || issue.summary}</h3>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:6}}>
              <div className="board-comment-subtitle" style={{display:'inline-flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                {issue.assignedBy ? <span>{`Reported by ${issue.assignedBy}`}</span> : null}
                {reporterRole ? (
                  <span className="issue-role-badge" style={getRoleBadgeStyle(reporterRole)}>
                    {reporterRole}
                  </span>
                ) : null}
              </div>
              <div />
            </div>
          </div>

          <button type="button" className="board-comment-close" onClick={onClose}><FiX /></button>
        </div>

        <div className="board-comment-body">
          <div style={{marginBottom:8}} dangerouslySetInnerHTML={{__html: issue.description || '<i>(no description)</i>'}} />

          {Array.isArray(issue.attachments) && issue.attachments.length > 0 && (
            <div>
              <div className="board-comment-label">Attachments</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
                {issue.attachments.map((att, i) => (
                  <div key={i} className="board-comment-file-item" style={{padding:'8px 10px'}}>
                    {resolveAttachmentUrl(att) ? (
                      <button className="board-comment-file" type="button" onClick={() => openIssueAttachment(att)}>{att.name || att.originalFilename || `File ${i+1}`}</button>
                    ) : (
                      <span>{att.name || `File ${i+1}`}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{marginTop:12}}>
            <div className="board-comment-label">Comments</div>
            {(issue.comments || []).length === 0 ? (
              <div style={{marginTop:8}} className="board-comment-empty">No comments yet.</div>
            ) : (
              (issue.comments || []).map((c, idx) => {
                const authorName = c.authorName || c.authorEmail || 'Member'
                const authorAvatar = c.authorAvatar || c.avatar || c.userAvatar || ''
                const authorRole = getRoleLabel(c.authorRole || c.role || '')
                const time = c.createdAt ? (new Date(c.createdAt)).toLocaleString() : ''
                return (
                  <div key={c.id || idx} className="board-comment-item" style={{marginTop:12}}>
                    <div className="board-comment-meta" style={{alignItems:'flex-start', gap:12}}>
                      <div className="comment-author-left">
                        {authorAvatar ? (
                          <img src={authorAvatar} alt={authorName} className="issue-avatar" style={{width:36,height:36}} />
                        ) : (
                          <div className="issue-avatar issue-avatar-initials" style={{width:36,height:36,fontSize:12}}>{getInitials(authorName)}</div>
                        )}
                      </div>

                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',flex:1}}>
                          <div style={{fontWeight:700}} className="board-comment-author">{authorName}</div>
                          {authorRole ? (
                            <span className="comment-role-badge" style={getRoleBadgeStyle(authorRole)}>
                              {authorRole}
                            </span>
                          ) : null}
                          <div style={{marginLeft:'auto',color:'#6b7280',fontSize:12}} className="board-comment-time">{time}</div>
                        </div>
                        <div style={{marginTop:8}} className="board-comment-message">{c.message}</div>
                        {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                          <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                            {c.attachments.map((att,i2) => (
                              <button key={i2} type="button" className="board-comment-attachment" onClick={() => openIssueAttachment(att)}>{att.name || att.originalFilename || `Attachment ${i2+1}`}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
