import React from 'react'
import { FiX } from 'react-icons/fi'
import { getInitials } from '../utils/initials'

export default function IssueDetailModal({ issue, onClose, resolveAttachmentUrl }){
  if(!issue) return null

  const openAttachment = (attachment) => {
    const url = (resolveAttachmentUrl && resolveAttachmentUrl(attachment)) || (attachment && (attachment.url || attachment.fileUrl || attachment.link))
    if(!url) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getRoleColor = (role) => {
    if (!role) return '#94a3b8' // slate
    const r = (role || '').toString().toLowerCase()
    if (r.includes('tester') || r === 'tester') return '#10b981' // green
    if (r.includes('report') || r.includes('creator') || r.includes('reporter')) return '#2563eb' // blue
    if (r.includes('admin') || r.includes('manager') || r.includes('project manager')) return '#7c3aed' // indigo
    if (r.includes('developer') || r.includes('dev')) return '#8b5cf6' // purple
    return '#64748b' // default slate-500
  }

  return (
    <div className="board-comment-overlay" onClick={onClose}>
      <div className="board-comment-modal" onClick={(e)=>e.stopPropagation()} style={{width:'min(840px,96vw)'}}>
        <div className="board-comment-header issue-detail-header">
          <div className="issue-header-left">
            {(() => {
              const avatarUrl = issue.reporterAvatar || issue.reporterPhoto || issue.creatorAvatar || issue.avatar || issue.assigneeAvatar || ''
              const reporterName = issue.reporterName || issue.creatorName || issue.assignedBy || issue.assignee || ''
              if (avatarUrl) {
                return <img src={avatarUrl} alt={reporterName || 'User'} className="issue-avatar" />
              }
              const initials = getInitials(reporterName || issue.reportedBy || issue.assignedBy || '')
              return <div className="issue-avatar issue-avatar-initials">{initials}</div>
            })()}
          </div>

          <div style={{flex:1}}>
            <h3 style={{margin:0}}>{issue.displayKey || issue.id || issue.issueKey || ''} · {issue.title || issue.summary}</h3>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginTop:6}}>
              <div>
                <div className="board-comment-subtitle">{issue.assignedBy ? `Reported by ${issue.assignedBy}` : ''}</div>
                {(() => {
                  const role = issue.reporterRole || issue.creatorRole || issue.role || issue.assigneeRole || issue.userRole || ''
                  if (!role) return null
                  const color = getRoleColor(role)
                  return (
                    <div className="role-title" style={{marginTop:6}}>
                      <span className="role-dot" style={{background: color}} />
                      <span style={{marginLeft:8,color:'#374151',fontSize:13,fontWeight:600}}>{role}</span>
                    </div>
                  )
                })()}
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
                    {(att.url || att.data) ? (
                      <button className="board-comment-file" type="button" onClick={() => openAttachment(att)}>{att.name || att.originalFilename || `File ${i+1}`}</button>
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
                const authorRole = c.authorRole || c.role || ''
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
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <div style={{display:'flex',flexDirection:'column',gap:4,flex:1}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{fontWeight:700}} className="board-comment-author">{authorName}</div>
                              <div style={{marginLeft:'auto',color:'#6b7280',fontSize:12}} className="board-comment-time">{time}</div>
                            </div>
                            {authorRole ? (
                              <div className="role-title">
                                <span className="role-dot" style={{background: getRoleColor(authorRole)}} />
                                <span style={{marginLeft:8,color:'#374151',fontSize:13,fontWeight:600}}>{authorRole}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <div style={{marginTop:8}} className="board-comment-message">{c.message}</div>
                        {Array.isArray(c.attachments) && c.attachments.length > 0 && (
                          <div style={{marginTop:8,display:'flex',gap:8,flexWrap:'wrap'}}>
                            {c.attachments.map((att,i2) => (
                              <button key={i2} type="button" className="board-comment-attachment" onClick={() => openAttachment(att)}>{att.name || att.originalFilename || `Attachment ${i2+1}`}</button>
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
