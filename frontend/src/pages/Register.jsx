import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [role, setRole] = useState('')
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const navigate = useNavigate()
  const { setPendingUserId, setPendingFlow } = useAuth()

  const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
  const sanitizeName = (value) => stripLeadingSpace(value).replace(/[^A-Za-z\s]/g, '')
  const sanitizeEmail = (value) => stripLeadingSpace(value).replace(/[^A-Za-z0-9@.]/g, '')
  const preventLeadingSpace = (e) => {
    if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
  }
  const validateName = (value) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(trimmed)
      ? ''
      : 'Name can only contain letters and spaces'
  }

  const handleNameChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitizeName(raw)
    setName(sanitized)
    if (raw !== sanitized) {
      setNameError('Name can only contain letters and spaces')
      return
    }
    setNameError(validateName(sanitized))
  }
  const handleEmailChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitizeEmail(raw)
    setEmail(sanitized)
    if (raw !== sanitized) {
      setEmailError('Email cannot contain special characters (only letters, numbers, @ and .)')
      return
    }
    setEmailError('')
  }
  const handlePasswordChange = (e) => {
    const next = stripLeadingSpace(e.target.value)
    setPassword(next)
    if (confirmPassword && next !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
    } else {
      setConfirmPasswordError('')
    }
  }
  const handleConfirmPasswordChange = (e) => {
    const next = stripLeadingSpace(e.target.value)
    setConfirmPassword(next)
    if (password && next !== password) {
      setConfirmPasswordError('Passwords do not match')
    } else {
      setConfirmPasswordError('')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    // client-side validation
    const trimmedName = name.trim()
    if (!trimmedName) return setError('Name is required')
    if (!/^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(trimmedName)) {
      return setError('Name can only contain letters and spaces')
    }
    // require corporate email
    const lower = email.trim().toLowerCase()
    if (!lower.endsWith('@kavyainfoweb.com')) return setError('Use official email id')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirmPassword) return setError('Passwords do not match')
    // stronger password requirements (server will also validate)
    const missing = []
    if (!/[A-Z]/.test(password)) missing.push('one uppercase letter')
    if (!/[a-z]/.test(password)) missing.push('one lowercase letter')
    if (!/\d/.test(password)) missing.push('one digit')
    if (!/[^A-Za-z0-9]/.test(password)) missing.push('one special character')
    if (missing.length) return setError('Password must contain at least: ' + missing.join(', '))
    if (!role) return setError('Please select a role')
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: lower, password, role }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Registration failed')
      // OTP was sent to email — store pending user id then navigate to verify page
      setPendingUserId(body.userId)
      setPendingFlow('register')
      alert('Registration initiated. An OTP has been sent to your email. Please enter it to complete registration.')
      navigate('/verify-otp')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-root">
      <div className="auth-header">
        <div className="auth-logo" aria-hidden>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect x="4" y="3" width="16" height="18" rx="3" />
            <path d="M8 7h2v2H8zM12 7h2v2h-2zM8 11h2v2H8zM12 11h2v2h-2zM8 15h2v2H8zM12 15h2v2h-2z" fill="#fff" opacity="0.85"/>
          </svg>
        </div>
        <h1 className="auth-title-main">KavyaProMan 360</h1>
        <p className="auth-subtitle">Enterprise Project Management</p>
      </div>
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create account</h2>
        {error && <div className="auth-error">{error}</div>}
        <label>Name</label>
        <input
          value={name}
          onChange={handleNameChange}
          onKeyDown={preventLeadingSpace}
          required
        />
        {nameError && <div className="auth-error inline-auth-error">{nameError}</div>}
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={handleEmailChange}
          onKeyDown={preventLeadingSpace}
          autoComplete="email"
          required
        />
        {emailError && <div className="auth-error inline-auth-error">{emailError}</div>}
        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={handlePasswordChange}
            autoComplete="new-password"
            required
          />
          <button type="button" className="password-toggle" aria-pressed={showPassword} aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(s => !s)}>
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
        <div className="pw-rules">
          {(() => {
            const checks = {
              length: password.length >= 8,
              upper: /[A-Z]/.test(password),
              lower: /[a-z]/.test(password),
              digit: /\d/.test(password),
              special: /[^A-Za-z0-9]/.test(password)
            }
            return (
              <>
                <div className={`pw-rule ${checks.length ? 'valid' : 'invalid'}`}>Password is at least 8 characters</div>
                <div className={`pw-rule ${checks.upper ? 'valid' : 'invalid'}`}>Contains an uppercase letter (A-Z)</div>
                <div className={`pw-rule ${checks.lower ? 'valid' : 'invalid'}`}>Contains a lowercase letter (a-z)</div>
                <div className={`pw-rule ${checks.digit ? 'valid' : 'invalid'}`}>Contains a digit (0-9)</div>
                <div className={`pw-rule ${checks.special ? 'valid' : 'invalid'}`}>Contains a special character (e.g. !@#$%)</div>
              </>
            )
          })()}
        </div>
        <label>Confirm Password</label>
        <div className="password-wrapper">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            autoComplete="new-password"
            required
          />
          <button type="button" className="password-toggle" aria-pressed={showConfirmPassword} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} onClick={() => setShowConfirmPassword(s => !s)}>
            {showConfirmPassword ? (
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
        {confirmPasswordError && <div className="auth-error inline-auth-error">{confirmPasswordError}</div>}

        <label>Role</label>
        <select value={role} onChange={e => setRole(e.target.value)} required>
          <option value="">Select role</option>
          <option>Admin</option>
          <option>Project Manager</option>
          <option>Developer</option>
          <option>Tester</option>
          <option>Business Analyst</option>
        </select>
        <button className="auth-btn" type="submit">Sign up</button>
        <div className="auth-foot">Already have an account? <a href="/login">Sign in</a></div>
      </form>
    </div>
  )
}
