import { useNavigate, useLocation } from 'react-router-dom'
import './PaymentMethod.css'
import { useEffect, useMemo, useState } from 'react'
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
  const [touched, setTouched] = useState({ name: false, number: false, expiry: false, cvc: false, upi: false })
  const [submitted, setSubmitted] = useState(false)
  const [payError, setPayError] = useState('')
  const [savedMethods, setSavedMethods] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [selectedSavedId, setSelectedSavedId] = useState('')

  // Prefill from navigation state if present
  const planFromState = location?.state?.plan || null
  const billingCycleFromState = location?.state?.billingCycle || 'monthly'
  const methodFromState = location?.state?.paymentMethod || null
  const safeMethodFromState = methodFromState === 'upi' ? 'upi' : methodFromState === 'card' ? 'card' : null
  useEffect(() => {
    if (safeMethodFromState) setMethod(safeMethodFromState)
  }, [safeMethodFromState])
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

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
  }

  const luhnCheck = (digits) => {
    let sum = 0
    let shouldDouble = false
    for (let i = digits.length - 1; i >= 0; i -= 1) {
      let digit = Number(digits[i])
      if (shouldDouble) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      sum += digit
      shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
  }

  const cardDigits = cardNumber.replace(/\D/g, '')
  const nameError = useMemo(() => {
    const value = cardHolderName.trim()
    if (!value) return 'Cardholder name is required.'
    if (!/^[A-Za-z][A-Za-z\s'.-]{1,}$/.test(value)) return 'Use letters only (spaces, . \' - allowed).'
    return ''
  }, [cardHolderName])

  const cardNumberError = useMemo(() => {
    if (!cardDigits) return 'Card number is required.'
    if (cardDigits.length !== 16) return 'Card number must be exactly 16 digits.'
    return ''
  }, [cardDigits])

  const expiryError = useMemo(() => {
    if (!cardExpiry) return 'Expiry date is required.'
    if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return 'Use MM/YY format.'
    const [mm, yy] = cardExpiry.split('/').map(v => Number(v))
    if (mm < 1 || mm > 12) return 'Month must be between 01 and 12.'
    const now = new Date()
    const currentYear = now.getFullYear() % 100
    const currentMonth = now.getMonth() + 1
    if (yy < currentYear || (yy === currentYear && mm < currentMonth)) return 'Card is expired.'
    return ''
  }, [cardExpiry])

  const cvcError = useMemo(() => {
    if (!cardCvc) return 'CVC is required.'
    if (!/^\d{3,4}$/.test(cardCvc)) return 'CVC must be 3 or 4 digits.'
    return ''
  }, [cardCvc])

  const upiError = useMemo(() => {
    if (!upiId) return 'UPI ID is required.'
    if (!/^[A-Za-z0-9._-]{2,}@[A-Za-z]{2,}$/.test(upiId)) return 'Enter a valid UPI ID (e.g. name@bank).'
    return ''
  }, [upiId])

  const savedCards = useMemo(() => savedMethods.filter((m) => m.type === 'card'), [savedMethods])
  const savedUpis = useMemo(() => savedMethods.filter((m) => m.type === 'upi'), [savedMethods])
  const selectedSaved = savedMethods.find((m) => m.id === selectedSavedId)
  const isUsingSavedCard = method === 'card' && selectedSaved?.type === 'card'
  const isUsingSavedUpi = method === 'upi' && selectedSaved?.type === 'upi'

  const isCardFormValid = isUsingSavedCard || (!nameError && !cardNumberError && !expiryError && !cvcError)
  const isUpiFormValid = isUsingSavedUpi || !upiError
  const isPayDisabled = method === 'upi' ? !isUpiFormValid : !isCardFormValid

  useEffect(() => {
    let isMounted = true
    async function loadMethods() {
      setSavedLoading(true)
      try {
        const headers = {}
        if (user?.id) headers['X-USER-ID'] = String(user.id)
        const res = await fetch(`${API_BASE}/api/payment-methods`, { headers })
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return
        setSavedMethods(Array.isArray(data) ? data : [])
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setSavedLoading(false)
      }
    }

    loadMethods()
    return () => { isMounted = false }
  }, [user?.id])

  useEffect(() => {
    if (!selectedSavedId) return
    if (selectedSaved && selectedSaved.type !== method) {
      setSelectedSavedId('')
    }
  }, [method, selectedSaved, selectedSavedId])

  function handleSelectSaved(methodItem) {
    setSelectedSavedId(methodItem.id)
    if (methodItem.type === 'card') {
      setMethod('card')
      if (methodItem.cardHolderName) setCardHolderName(methodItem.cardHolderName)
      setCardNumber('')
      setCardExpiry('')
      setCardCvc('')
    }
    if (methodItem.type === 'upi') {
      setMethod('upi')
      if (methodItem.upiId) setUpiId(methodItem.upiId)
    }
  }

  function clearSavedSelection() {
    setSelectedSavedId('')
  }

  async function handlePay() {
    setSubmitted(true)
    setPayError('')
    if (isPayDisabled) return
    const payload = {
      userId: user?.id || '',
      name: displayName,
      email: displayEmail,
      planName: planKey,
      billingCycle: billingCycleFromState,
      method,
      amount,
      currency: 'USD',
      upiId: method === 'upi' ? (isUsingSavedUpi ? selectedSaved?.upiId : upiId) : null,
      cardLast4: method === 'card'
        ? (isUsingSavedCard ? selectedSaved?.cardLast4 : cardNumber.replace(/\D/g, '').slice(-4))
        : null
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (user?.id) headers['X-USER-ID'] = String(user.id)
      const res = await fetch(`${API_BASE}/api/payment/confirm`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Payment failed. Please try again.')
      }
    } catch (err) {
      setPayError(err?.message || 'Payment failed. Please try again.')
      return
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
            <div className="saved-methods">
              <div className="saved-title">Saved cards</div>
              {savedLoading && <div className="saved-muted">Loading saved cards...</div>}
              {!savedLoading && savedCards.length === 0 && (
                <div className="saved-muted">No saved cards yet.</div>
              )}
              {!savedLoading && savedCards.length > 0 && (
                <div className="saved-list">
                  {savedCards.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={`saved-item ${selectedSavedId === item.id ? 'active' : ''}`}
                      onClick={() => handleSelectSaved(item)}
                    >
                      <span className="saved-label">**** **** **** {item.cardLast4 || '0000'}</span>
                      <span className="saved-sub">{item.cardHolderName || 'Cardholder'}</span>
                    </button>
                  ))}
                </div>
              )}
              {isUsingSavedCard && (
                <button type="button" className="saved-clear" onClick={clearSavedSelection}>
                  Use a different card
                </button>
              )}
            </div>
            <label>Cardholder name</label>
            <input
              className={`form-control ${((touched.name || submitted) && nameError) ? 'invalid' : cardHolderName ? 'valid' : ''}`}
              placeholder="Name on card"
              value={cardHolderName}
              onChange={(e) => {
                const cleaned = e.target.value.replace(/[^A-Za-z\s'.-]/g, '')
                setCardHolderName(cleaned.replace(/^\s+/, ''))
              }}
              onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
              disabled={isUsingSavedCard}
            />
            {!isUsingSavedCard && ((touched.name || submitted) && nameError) && <div className="payment-error">{nameError}</div>}
            <label className="mt-2">Card number</label>
            <input
              className={`form-control ${((touched.number || submitted) && cardNumberError) ? 'invalid' : cardNumber ? 'valid' : ''}`}
              placeholder={isUsingSavedCard ? `**** **** **** ${selectedSaved?.cardLast4 || '0000'}` : '4242 4242 4242 4242'}
              inputMode="numeric"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              onBlur={() => setTouched(prev => ({ ...prev, number: true }))}
              disabled={isUsingSavedCard}
            />
            {!isUsingSavedCard && ((touched.number || submitted) && cardNumberError) && <div className="payment-error">{cardNumberError}</div>}
            <div className="d-flex gap-2 mt-2">
              <div className="flex-fill">
                <input
                  className={`form-control ${((touched.expiry || submitted) && expiryError) ? 'invalid' : cardExpiry ? 'valid' : ''}`}
                  placeholder="MM/YY"
                  inputMode="numeric"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  onBlur={() => setTouched(prev => ({ ...prev, expiry: true }))}
                  disabled={isUsingSavedCard}
                />
                {!isUsingSavedCard && ((touched.expiry || submitted) && expiryError) && <div className="payment-error">{expiryError}</div>}
              </div>
              <div className="flex-fill">
                <input
                  className={`form-control ${((touched.cvc || submitted) && cvcError) ? 'invalid' : cardCvc ? 'valid' : ''}`}
                  placeholder="CVC"
                  inputMode="numeric"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onBlur={() => setTouched(prev => ({ ...prev, cvc: true }))}
                  disabled={isUsingSavedCard}
                />
                {!isUsingSavedCard && ((touched.cvc || submitted) && cvcError) && <div className="payment-error">{cvcError}</div>}
              </div>
            </div>
            <div className="mt-4 d-flex gap-2">
              <button className="btn btn-primary" onClick={handlePay} disabled={isPayDisabled}>Pay</button>
              <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
            </div>
            {payError && <div className="payment-submit-error">{payError}</div>}
            </div>
          )}

          {method === 'upi' && (
            <div className="method-form">
              <div className="saved-methods">
                <div className="saved-title">Saved UPI IDs</div>
                {savedLoading && <div className="saved-muted">Loading saved UPI IDs...</div>}
                {!savedLoading && savedUpis.length === 0 && (
                  <div className="saved-muted">No saved UPI IDs yet.</div>
                )}
                {!savedLoading && savedUpis.length > 0 && (
                  <div className="saved-list">
                    {savedUpis.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        className={`saved-item ${selectedSavedId === item.id ? 'active' : ''}`}
                        onClick={() => handleSelectSaved(item)}
                      >
                        <span className="saved-label">{item.upiId}</span>
                      </button>
                    ))}
                  </div>
                )}
                {isUsingSavedUpi && (
                  <button type="button" className="saved-clear" onClick={clearSavedSelection}>
                    Use a different UPI ID
                  </button>
                )}
              </div>
              <label>UPI ID</label>
              <div className="d-flex gap-2">
                <input
                  className={`form-control ${((touched.upi || submitted) && upiError) ? 'invalid' : upiId ? 'valid' : ''}`}
                  placeholder="Enter your UPI ID"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value.replace(/\s/g, ''))}
                  onBlur={() => setTouched(prev => ({ ...prev, upi: true }))}
                  disabled={isUsingSavedUpi}
                />
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => { navigator.clipboard?.writeText(upiId || ''); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                  disabled={!upiId}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              {((touched.upi || submitted) && upiError) && <div className="payment-error">{upiError}</div>}
              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-primary" onClick={handlePay} disabled={isPayDisabled}>Pay</button>
                <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
              </div>
              {payError && <div className="payment-submit-error">{payError}</div>}
            </div>
          )}

          <div className="preview-column">
            {method === 'card' && (
              <div className="card-large-preview">
                <div className="card-chip" />
                <div className="card-number">
                  {isUsingSavedCard
                    ? `**** **** **** ${selectedSaved?.cardLast4 || '0000'}`
                    : (cardNumber || '4242 4242 4242 4242')}
                </div>
                <div className="card-meta">
                  <div>{cardHolderName.trim() ? cardHolderName.trim().toUpperCase() : 'JOHN DOE'}</div>
                  <div>{isUsingSavedCard ? '••/••' : (cardExpiry || '12/26')}</div>
                </div>
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
