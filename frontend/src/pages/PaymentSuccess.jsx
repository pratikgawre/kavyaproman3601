import { useLocation, useNavigate } from 'react-router-dom'
import { FiCheck } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import { useEffect, useState } from 'react'
import API_BASE from '../config/api'
import './PaymentSuccess.css'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const [resolvedName, setResolvedName] = useState('')
  const [resolvedEmail, setResolvedEmail] = useState('')

  const planFromState = location?.state?.plan || 'Professional'
  const billingCycleFromState = location?.state?.billingCycle || 'monthly'
  const nameFromState = location?.state?.name || ''
  const emailFromState = location?.state?.email || ''

  const displayName = resolvedName || nameFromState || user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const displayEmail = resolvedEmail || emailFromState || user?.email || 'guest@example.com'
  const planLabel = String(planFromState).charAt(0).toUpperCase() + String(planFromState).slice(1)

  useEffect(() => {
    let isMounted = true

    async function fetchUser() {
      if (!user?.id) return
      try {
        const res = await fetch(`${API_BASE}/api/user/me`, {
          headers: { 'X-USER-ID': String(user.id) }
        })
        if (!res.ok) return
        const dbUser = await res.json()
        if (!isMounted) return
        if (dbUser?.name) setResolvedName(dbUser.name)
        if (dbUser?.email) setResolvedEmail(dbUser.email)
      } catch (err) {
        // Keep fallback values if fetch fails
      }
    }

    fetchUser()
    return () => { isMounted = false }
  }, [user?.id])

  return (
    <div className="payment-success-root">
      <div className="success-hero">
        <div className="success-icon" aria-hidden="true">
          <FiCheck size={56} />
        </div>
        <h1>Payment Successful</h1>
        <p>Your purchase was successful.</p>
      </div>

      <div className="success-card">
        <div className="success-row">
          <span className="label">Purchased Plan:</span>
          <span className="value">{planLabel}</span>
        </div>
        <div className="success-row">
          <span className="label">Name:</span>
          <span className="value">{displayName}</span>
        </div>
        <div className="success-row">
          <span className="label">Email:</span>
          <span className="value">{displayEmail}</span>
        </div>

        <button
          className="btn success-done"
          onClick={() => navigate('/subscription', { state: { currentPlan: planFromState, billingCycle: billingCycleFromState } })}
        >
          Done
        </button>
      </div>
    </div>
  )
}
