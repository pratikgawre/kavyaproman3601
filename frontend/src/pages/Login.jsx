import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setPendingUserId, setPendingFlow, setUser } = useAuth()

  const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
  const sanitizeEmail = (value) => stripLeadingSpace(value).replace(/[^A-Za-z0-9@.]/g, '')
  const preventLeadingSpace = (e) => {
    if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Login failed')

      // If OTP was sent, navigate to verify page (always expected now)
      if (body.message === 'OTP sent to email') {
        setPendingUserId(body.userId)
        setPendingFlow('login')
        alert('A verification code has been sent to your email. Please enter it to complete login.')
        navigate('/verify-otp')
        return
      }

      // store returned name if available; fall back to email
      const userToStore = { id: body.userId, email: body.email }
      if (body.name) userToStore.name = body.name
      if (body.firstName && !userToStore.name) userToStore.name = body.firstName
      if (body.role) userToStore.role = body.role
      if (body.avatar) userToStore.avatar = body.avatar
      setUser(userToStore)
      navigate('/organization', { replace: true })
    } catch (err) {
      setError(err.message)
    }
  }

  // Note: OTP verification is handled on the dedicated /verify-otp page

  return (
    <div className="auth-root">
      <div className="auth-header">
        <div className="auth-logo" aria-hidden>
          {/* simple building icon as inline SVG */}
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <path d="M8 7h2v2H8zM12 7h2v2h-2zM8 11h2v2H8zM12 11h2v2h-2zM8 15h2v2H8zM12 15h2v2h-2z" fill="#fff" opacity="0.85"/>
          </svg>
        </div>
        <h1 className="auth-title-main">KavyaProMan 360</h1>
        <p className="auth-subtitle">Enterprise Project Management</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Welcome Back</h2>
        <p className="muted">Sign in to your account to continue</p>
        {error && <div className="auth-error">{error}</div>}
        <label>Email Address</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(sanitizeEmail(e.target.value))}
          onKeyDown={preventLeadingSpace}
          autoComplete="email"
          required
        />
        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(stripLeadingSpace(e.target.value))}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(s => !s)}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" strokeLinecap="round" strokeLinejoin="round"></path>
                <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round"></circle>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M17.94 17.94A10.97 10.97 0 0 1 12 20c-6 0-10-5.5-10-8 1.27-2.2 4.29-5 8.46-6.18" strokeLinecap="round" strokeLinejoin="round"></path>
                <path d="M1 1l22 22" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
            )}
          </button>
        </div>
        <div className="auth-row">
          <a className="muted" href="/forgot-password">Forgot password?</a>
        </div>
        <button className="auth-btn" type="submit">Sign In</button>
        <div className="divider">Or continue with</div>
        <div className="auth-socials">
          <button className="social mt-2">Google</button>
          <button className="social mt-2">GitHub</button>
        </div>
        <div className="auth-foot">Don't have an account? <a href="/register">Sign up</a></div>
      </form>
    </div>
  )
}
