import './UpdatePayment.css'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiCreditCard, FiSmartphone, FiPlus, FiArrowRight, FiArrowLeft, FiTrash2, FiClock, FiDollarSign, FiFileText } from 'react-icons/fi'
import API_BASE from '../config/api'
import { useAuth } from '../context/AuthContext'

export default function UpdatePayment() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [methods, setMethods] = useState([])
  const [methodsLoading, setMethodsLoading] = useState(false)
  const [methodType, setMethodType] = useState('card')
  const [cardHolderName, setCardHolderName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [upiId, setUpiId] = useState('')
  const [touched, setTouched] = useState({ name: false, number: false, expiry: false, cvc: false, upi: false })
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    let isMounted = true
    async function loadPayments() {
      setPaymentsLoading(true)
      try {
        const headers = {}
        if (user?.id) headers['X-USER-ID'] = String(user.id)
        const res = await fetch(`${API_BASE}/api/payment`, { headers })
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return
        setPayments(Array.isArray(data) ? data : [])
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setPaymentsLoading(false)
      }
    }

    loadPayments()
    return () => { isMounted = false }
  }, [user?.id])

  useEffect(() => {
    let isMounted = true
    async function loadMethods() {
      setMethodsLoading(true)
      try {
        const headers = {}
        if (user?.id) headers['X-USER-ID'] = String(user.id)
        const res = await fetch(`${API_BASE}/api/payment-methods`, { headers })
        if (!res.ok) return
        const data = await res.json()
        if (!isMounted) return
        setMethods(Array.isArray(data) ? data : [])
      } catch (err) {
        // ignore
      } finally {
        if (isMounted) setMethodsLoading(false)
      }
    }

    loadMethods()
    return () => { isMounted = false }
  }, [user?.id])

  const formatDate = (value) => {
    if (!value) return 'N/A'
    const date = new Date(value)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const formatAmount = (amount, currency) => {
    const numeric = typeof amount === 'number' ? amount : Number(amount || 0)
    return `${currency || 'USD'} ${numeric.toFixed(2)}`
  }

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 16)
    return digits.replace(/(.{4})/g, '$1 ').trim()
  }

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}/${digits.slice(2)}`
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

  const isCardFormValid = !nameError && !cardNumberError && !expiryError && !cvcError
  const isUpiFormValid = !upiError
  const isFormValid = methodType === 'upi' ? isUpiFormValid : isCardFormValid

  const lastPayment = payments.length > 0 ? payments[0] : null

  async function handleAddMethod() {
    setSubmitted(true)
    setFormError('')
    setFormSuccess('')
    if (!isFormValid) return

    const payload = {
      userId: user?.id || '',
      type: methodType,
      upiId: methodType === 'upi' ? upiId : null,
      cardLast4: methodType === 'card' ? cardDigits.slice(-4) : null,
      cardHolderName: methodType === 'card' ? cardHolderName.trim() : null
    }

    try {
      const headers = { 'Content-Type': 'application/json' }
      if (user?.id) headers['X-USER-ID'] = String(user.id)
      const res = await fetch(`${API_BASE}/api/payment-methods`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Unable to save payment method.')
      }
      const saved = await res.json().catch(() => null)
      setMethods(prev => saved ? [saved, ...prev] : prev)
      setFormSuccess('Payment method saved. You can now use it to pay for another plan.')
      setCardHolderName('')
      setCardNumber('')
      setCardExpiry('')
      setCardCvc('')
      setUpiId('')
      setTouched({ name: false, number: false, expiry: false, cvc: false, upi: false })
      setSubmitted(false)
    } catch (err) {
      setFormError(err?.message || 'Unable to save payment method.')
    }
  }

  async function handleDeleteMethod(id) {
    if (!id) return
    try {
      await fetch(`${API_BASE}/api/payment-methods/${id}`, { method: 'DELETE' })
      setMethods(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      // ignore
    }
  }

  const summaryItems = [
    { label: 'Plan', value: lastPayment?.planName || 'N/A', icon: <FiFileText /> },
    { label: 'Billing Cycle', value: lastPayment?.billingCycle || 'N/A', icon: <FiClock /> },
    { label: 'Amount', value: lastPayment ? formatAmount(lastPayment.amount, lastPayment.currency) : 'N/A', icon: <FiDollarSign /> },
    { label: 'Method', value: lastPayment?.method || 'N/A', icon: <FiCreditCard /> },
    { label: 'Date', value: lastPayment ? formatDate(lastPayment.createdAt) : 'N/A', icon: <FiClock /> },
    { label: 'Reference', value: lastPayment?.referenceId || 'N/A', icon: <FiFileText /> }
  ]

  return (
    <div className="update-payment-root">
      <div className="update-payment-shell">
        <div className="update-payment-header">
          <div>
            <button className="btn update-back-btn" type="button" onClick={() => navigate('/subscription')}>
              <FiArrowLeft className="me-2" /> Back to Subscription
            </button>
            <h2>Update Payment Method</h2>
            <p className="text-muted">Manage your saved payment details and pay for another plan anytime.</p>
          </div>
        </div>

        <div className="update-payment-grid">
          <div className="left-column">
            <div className="update-card highlight-card">
              <div className="card-title">Previous Payment Details</div>
              {paymentsLoading && <div className="text-muted mt-2">Loading latest payment...</div>}
              {!paymentsLoading && !lastPayment && (
                <div className="empty-state">No previous payments found.</div>
              )}
              {!paymentsLoading && lastPayment && (
                <div className="summary-grid">
                  {summaryItems.map((item) => (
                    <div className="summary-item" key={item.label}>
                      <div className="summary-icon">{item.icon}</div>
                      <div>
                        <div className="summary-label">{item.label}</div>
                        <div className="summary-value">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="update-card mt-4">
              <div className="card-title">Saved Payment Methods</div>
              {methodsLoading && <div className="text-muted mt-2">Loading saved methods...</div>}
              {!methodsLoading && methods.length === 0 && (
                <div className="empty-state">No saved methods yet. Add one on the right.</div>
              )}
              {!methodsLoading && methods.length > 0 && (
                <div className="method-list">
                  {methods.map((method) => (
                    <div className="method-row" key={method.id}>
                      <div className="method-info">
                        <div className="method-icon">
                          {method.type === 'upi' ? <FiSmartphone /> : <FiCreditCard />}
                        </div>
                        <div>
                          <div className="method-title">
                            {method.type === 'upi' ? 'UPI ID' : 'Card'}
                          </div>
                          <div className="method-subtitle">
                            {method.type === 'upi' ? method.upiId : `**** **** **** ${method.cardLast4 || '0000'}`}
                          </div>
                          {method.cardHolderName && (
                            <div className="method-subtitle">{method.cardHolderName}</div>
                          )}
                        </div>
                      </div>
                      <div className="method-actions">
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => navigate('/subscription', { state: { paymentMethod: method.type } })}
                        >
                          Use to Pay
                        </button>
                        <button
                          className="btn btn-link btn-sm delete-btn"
                          onClick={() => handleDeleteMethod(method.id)}
                          title="Remove method"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="right-column">
            <div className="update-card form-card">
              <div className="card-title">Add Another Payment Method</div>
              <div className="method-toggle mt-3">
                <button className={`btn ${methodType === 'card' ? 'active' : ''}`} onClick={() => setMethodType('card')}>
                  <FiCreditCard className="me-2" /> Card
                </button>
                <button className={`btn ${methodType === 'upi' ? 'active' : ''}`} onClick={() => setMethodType('upi')}>
                  <FiSmartphone className="me-2" /> UPI
                </button>
              </div>

              {methodType === 'card' && (
                <div className="form-section">
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
                  />
                  {((touched.name || submitted) && nameError) && <div className="payment-error">{nameError}</div>}

                  <label className="mt-3">Card number</label>
                  <input
                    className={`form-control ${((touched.number || submitted) && cardNumberError) ? 'invalid' : cardNumber ? 'valid' : ''}`}
                    placeholder="4242 4242 4242 4242"
                    inputMode="numeric"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    onBlur={() => setTouched(prev => ({ ...prev, number: true }))}
                  />
                  {((touched.number || submitted) && cardNumberError) && <div className="payment-error">{cardNumberError}</div>}

                  <div className="d-flex gap-2 mt-3">
                    <div className="flex-fill">
                      <label>Expiry</label>
                      <input
                        className={`form-control ${((touched.expiry || submitted) && expiryError) ? 'invalid' : cardExpiry ? 'valid' : ''}`}
                        placeholder="MM/YY"
                        inputMode="numeric"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        onBlur={() => setTouched(prev => ({ ...prev, expiry: true }))}
                      />
                      {((touched.expiry || submitted) && expiryError) && <div className="payment-error">{expiryError}</div>}
                    </div>
                    <div className="flex-fill">
                      <label>CVC</label>
                      <input
                        className={`form-control ${((touched.cvc || submitted) && cvcError) ? 'invalid' : cardCvc ? 'valid' : ''}`}
                        placeholder="CVC"
                        inputMode="numeric"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        onBlur={() => setTouched(prev => ({ ...prev, cvc: true }))}
                      />
                      {((touched.cvc || submitted) && cvcError) && <div className="payment-error">{cvcError}</div>}
                    </div>
                  </div>
                </div>
              )}

              {methodType === 'upi' && (
                <div className="form-section">
                  <label>UPI ID</label>
                  <input
                    className={`form-control ${((touched.upi || submitted) && upiError) ? 'invalid' : upiId ? 'valid' : ''}`}
                    placeholder="yourname@bank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value.replace(/\s/g, ''))}
                    onBlur={() => setTouched(prev => ({ ...prev, upi: true }))}
                  />
                  {((touched.upi || submitted) && upiError) && <div className="payment-error">{upiError}</div>}
                </div>
              )}

              {formError && <div className="payment-submit-error">{formError}</div>}
              {formSuccess && <div className="payment-success-note">{formSuccess}</div>}

              <div className="form-actions">
                <button className="btn btn-primary" onClick={handleAddMethod}>
                  <FiPlus className="me-2" /> Save method
                </button>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/subscription')}>
                  Back to subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
