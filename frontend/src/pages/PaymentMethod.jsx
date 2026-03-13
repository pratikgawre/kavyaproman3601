import { useNavigate, useLocation } from 'react-router-dom'
import './PaymentMethod.css'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import API_BASE from '../config/api'

export default function PaymentMethod(){
  const navigate = useNavigate()
  const location = useLocation()
  const [method, setMethod] = useState('card')
  const { user } = useAuth()
  const [upiId, setUpiId] = useState('')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')

  // Prefill from navigation state if present
  const planFromState = location?.state?.plan || null
  const billingCycleFromState = location?.state?.billingCycle || 'monthly'
  const methodFromState = location?.state?.paymentMethod || null
  const safeMethodFromState = methodFromState === 'upi' ? 'upi' : methodFromState === 'card' ? 'card' : null
  if (safeMethodFromState && method !== safeMethodFromState) setMethod(safeMethodFromState)
  const [copied, setCopied] = useState(false)
  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'Guest')
  const displayEmail = user?.email || 'guest@example.com'

  const planKey = String(planFromState || 'professional').trim().toLowerCase()
  const planPricing = {
    free: { monthly: 0, yearly: 0 },
    professional: { monthly: 12, yearly: 120 },
    business: { monthly: 25, yearly: 250 },
    enterprise: { monthly: 0, yearly: 0 }
  }
  const amount = (planPricing[planKey] && planPricing[planKey][billingCycleFromState]) || 0
  const isPayDisabled = method === 'upi' ? !upiId : !cardNumber

  async function handlePay() {
    const payload = {
      userId: user?.id || '',
      name: displayName,
      email: displayEmail,
      planName: planKey,
      billingCycle: billingCycleFromState,
      method,
      amount,
      currency: 'USD',
      upiId: method === 'upi' ? upiId : null,
      cardLast4: method === 'card' ? cardNumber.replace(/\D/g, '').slice(-4) : null
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (user?.id) headers['X-USER-ID'] = String(user.id)
      await fetch(`${API_BASE}/api/payment/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
    } catch (err) {
      // Continue to success page even if API fails
    }

    navigate('/payment-success', { state: { plan: planFromState, billingCycle: billingCycleFromState, name: displayName, email: displayEmail } })
  }

  return (
    <div className="payment-root p-4">
      <div className="payment-card">
        <h2>Payment Method {planFromState ? `- ${planFromState.charAt(0).toUpperCase()+planFromState.slice(1)}` : ''}</h2>
        <p className="text-muted">Choose a payment method to complete your upgrade</p>

        <div className="method-tabs mt-3">
          <button className={`btn ${method === 'card' ? 'active' : ''}`} onClick={() => setMethod('card')}>Card</button>
          <button className={`btn ${method === 'upi' ? 'active' : ''}`} onClick={() => setMethod('upi')}>UPI</button>
        </div>

        <div className="payment-grid mt-4">
          {method === 'card' && (
            <div className="method-form">
            <label>Cardholder name</label>
            <input className="form-control" placeholder="Name on card" value={cardHolderName} onChange={(e) => setCardHolderName(e.target.value)} />
            <label className="mt-2">Card number</label>
            <input className="form-control" placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
            <div className="d-flex gap-2 mt-2">
              <input className="form-control" placeholder="MM/YY" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} />
              <input className="form-control" placeholder="CVC" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} />
            </div>
            <div className="mt-4 d-flex gap-2">
              <button className="btn btn-primary" onClick={handlePay} disabled={isPayDisabled}>Pay</button>
              <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
            </div>
            </div>
          )}

            {method === 'upi' && (
            <div className="method-form">
              <label>UPI ID</label>
              <div className="d-flex gap-2">
                <input
                  className="form-control"
                  placeholder="Enter your UPI ID"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => { navigator.clipboard?.writeText(upiId || ''); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                  disabled={!upiId}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-primary" onClick={handlePay} disabled={isPayDisabled}>Pay</button>
                <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
              </div>
            </div>
          )}

          <div className="preview-column">
            {method === 'card' && (
              <div className="card-large-preview">
                <div className="card-chip" />
                <div className="card-number">4242 4242 4242 4242</div>
                <div className="card-meta"><div>JOHN DOE</div><div>12/26</div></div>
              </div>
            )}

            {method === 'upi' && (
              <div className="upi-large-preview">
                <div className="upi-card-large">
                  <div className="upi-left-large">
                    <div className="upi-brand-large">UPI</div>
                    <div className="upi-id-large">{upiId || 'your-upi@bank'}</div>
                  </div>
                  <div className="upi-right-large">
                    <button className="btn btn-outline-secondary" onClick={() => { navigator.clipboard?.writeText(upiId || ''); setCopied(true); setTimeout(() => setCopied(false), 1400); }} disabled={!upiId}>{copied ? 'Copied' : 'Copy'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
