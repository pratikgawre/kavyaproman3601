import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import './Auth.css'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export default function ResetPassword() {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmPasswordError, setConfirmPasswordError] = useState('')
  const navigate = useNavigate()
  const { pendingUserId, clearPending } = useAuth()
  const userId = pendingUserId || ''

  function handleChange(i, v) {
    if (!/^[0-9]?$/.test(v)) return
    const next = [...code]
    next[i] = v
    setCode(next)
    setCodeVerified(false)
    if (v && i < 5) {
      const nextEl = document.getElementById('reset-otp-' + (i + 1))
      if (nextEl) nextEl.focus()
    }
  }

  function clearDigit(i) {
    const next = [...code]
    next[i] = ''
    setCode(next)
    setCodeVerified(false)
    const el = document.getElementById('reset-otp-' + i)
    if (el) el.focus()
  }

  const passwordRules = useMemo(
    () => [
      { id: 'length', label: 'Password is at least 8 characters', valid: newPassword.length >= 8 },
      { id: 'upper', label: 'Contains an uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
      { id: 'lower', label: 'Contains a lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
      { id: 'digit', label: 'Contains a digit (0-9)', valid: /\d/.test(newPassword) },
      { id: 'special', label: 'Contains a special character (e.g. !@#$%)', valid: /[^A-Za-z0-9]/.test(newPassword) }
    ],
    [newPassword]
  )

  const isStrongPassword = passwordRules.every((rule) => rule.valid)
  const isConfirmMatched = confirmPassword.length > 0 && confirmPassword === newPassword

  const handleNewPasswordChange = (e) => {
    const next = e.target.value
    setNewPassword(next)
    if (confirmPassword && next !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
    } else {
      setConfirmPasswordError('')
    }
  }

  const handleConfirmPasswordChange = (e) => {
    const next = e.target.value
    setConfirmPassword(next)
    if (newPassword && next !== newPassword) {
      setConfirmPasswordError('Passwords do not match')
    } else {
      setConfirmPasswordError('')
    }
  }

  function verifyCode(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const joined = code.join('')
    if (joined.length !== 6) {
      setCodeVerified(false)
      return setError('Enter full 6-digit code')
    }
    setCodeVerified(true)
    setSuccess('Code verified. You can set your new password.')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const joined = code.join('')
    if (joined.length !== 6) return setError('Enter full 6-digit code')
    if (!userId) return setError('Missing reset context. Please request a new code.')
    if (!codeVerified) return setError('Please verify your 6-digit code first')
    if (!isStrongPassword) return setError('Please satisfy all password requirements')
    if (!isConfirmMatched) {
      setConfirmPasswordError('Passwords do not match')
      return setError('Confirm password must match new password')
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, code: joined, newPassword })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Reset failed')

      alert('Password reset successful. Please login with your new password.')
      clearPending()
      navigate('/login')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="auth-root">
      <form className="auth-card reset-password-card" onSubmit={submit}>
        <div className="reset-header">
          <div className="reset-badge">Secure reset</div>
          <h2>Reset password</h2>
        </div>
        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">{success}</div>}

        <p className="muted reset-subtitle">Enter the 6-digit code you received and your new password</p>

        <div className="otp-row">
          {code.map((c, i) => (
            <div key={i} className="otp-box-wrap">
              <input
                id={'reset-otp-' + i}
                className="otp-box"
                maxLength={1}
                value={c}
                onChange={(e) => handleChange(i, e.target.value)}
              />
              <button type="button" className="otp-clear" onClick={() => clearDigit(i)} aria-label={`clear-${i}`}>
                x
              </button>
            </div>
          ))}
        </div>

        <button className="auth-btn verify-code-btn" type="button" onClick={verifyCode}>
          Verify code
        </button>

        <label>New password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={handleNewPasswordChange}
            autoComplete="new-password"
            required
          />
          <button type="button" className="password-toggle" onClick={() => setShowPassword((s) => !s)} aria-label="toggle-password">
            {showPassword ? <FiEye /> : <FiEyeOff />}
          </button>
        </div>

        <div className="pw-rules reset-pw-rules">
          {passwordRules.map((rule) => (
            <div key={rule.id} className={`pw-rule ${rule.valid ? 'valid' : ''}`}>
              <span className="rule-mark">{rule.valid ? '✓' : '✕'}</span>
              <span>{rule.label}</span>
            </div>
          ))}
        </div>

        <label>Confirm new password</label>
        <div className="password-wrapper">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowConfirmPassword((s) => !s)}
            aria-label="toggle-confirm-password"
          >
            {showConfirmPassword ? <FiEye /> : <FiEyeOff />}
          </button>
        </div>

        {confirmPasswordError && <div className="auth-error inline-auth-error">{confirmPasswordError}</div>}

        <button className="auth-btn" type="submit">
          Reset password
        </button>
      </form>
    </div>
  )
}
