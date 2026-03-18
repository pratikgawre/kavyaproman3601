import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export default function VerifyOtp() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { pendingUserId, pendingFlow, clearPending, setUser } = useAuth()
  const userId = pendingUserId || ''
  const flow = pendingFlow || 'register'
  const isTwoFactor = flow === '2fa'

  function handleChange(i, v) {
    if (!/^[0-9]?$/.test(v)) return
    const next = [...code]
    next[i] = v
    setCode(next)
    if (v && i < 5) {
      const nextEl = document.getElementById('otp-' + (i + 1))
      if (nextEl) nextEl.focus()
    }
  }

  function clearDigit(i){
    const next = [...code]; next[i]=''; setCode(next)
    const el = document.getElementById('otp-'+i); if(el) el.focus()
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    const joined = code.join('')
    if (joined.length !== 6) return setError('Enter full 6-digit code')
    if (!userId) return setError('Missing verification context. Please login or register again.')
    try {
      const verifyPath = isTwoFactor ? 'verify-2fa' : 'verify-otp'
      const res = await fetch(`${API_BASE}/api/auth/${verifyPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: joined })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Verification failed')
      // Decide next step depending on which flow initiated verification
      clearPending()
      if (flow === 'login' || flow === '2fa') {
        // after login verification, store user and navigate to organization
        const userToStore = { id: body.userId, email: body.email }
        if (body.name) userToStore.name = body.name
        if (body.role) userToStore.role = body.role
        if (body.avatar) userToStore.avatar = body.avatar
        setUser(userToStore)
        navigate('/organization')
      } else {
        // registration flow -> go to login
        alert('Verification successful. Please login.')
        navigate('/login')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  async function resend() {
    setError('')
    if (isTwoFactor) return setError('Resend is not available for Authenticator App verification.')
    if (!userId) return setError('Missing verification context. Please login or register again.')
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: '' })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Resend failed')
      alert('A new verification code was sent to your email.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-root">
      <form className="auth-card otp-card" onSubmit={submit}>
        <h2>{isTwoFactor ? 'Enter authenticator code' : 'Enter verification code'}</h2>
        {error && <div className="auth-error">{error}</div>}
        <p>
          {isTwoFactor
            ? 'Open your Authenticator app and enter the 6-digit code below.'
            : 'We sent a 6-digit code to your email. Enter it below.'}
        </p>
        <div className="otp-row">
          {code.map((c, i) => (
            <div key={i} className="otp-box-wrap">
              <input id={'otp-' + i} className="otp-box" maxLength={1} value={c} onChange={e => handleChange(i, e.target.value)} />
              <button type="button" className="otp-clear" onClick={()=>clearDigit(i)} aria-label={`clear-${i}`}>×</button>
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:10,flexDirection:'column'}}>
          <button className="auth-btn" type="submit">Verify</button>
          {!isTwoFactor && (
            <button type="button" className="auth-btn" style={{background:'#fff',color:'#4f46e5',border:'1px solid #e5e7eb'}} onClick={resend}>Resend code</button>
          )}
        </div>
      </form>
    </div>
  )
}
