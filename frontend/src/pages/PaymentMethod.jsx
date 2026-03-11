import { useNavigate, useLocation } from 'react-router-dom'
import './PaymentMethod.css'
import { useState } from 'react'

export default function PaymentMethod(){
  const navigate = useNavigate()
  const location = useLocation()
  const [method, setMethod] = useState('card')

  // Prefill from navigation state if present
  const planFromState = location?.state?.plan || null
  const methodFromState = location?.state?.paymentMethod || null
  if (methodFromState && method !== methodFromState) setMethod(methodFromState)
  const [copied, setCopied] = useState(false)

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
            <input className="form-control" placeholder="Name on card" />
            <label className="mt-2">Card number</label>
            <input className="form-control" placeholder="4242 4242 4242 4242" />
            <div className="d-flex gap-2 mt-2">
              <input className="form-control" placeholder="MM/YY" />
              <input className="form-control" placeholder="CVC" />
            </div>
            <div className="mt-4 d-flex gap-2">
              <button className="btn btn-primary" onClick={() => navigate('/subscription')}>Pay & Return</button>
              <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Cancel</button>
            </div>
            </div>
          )}

            {method === 'upi' && (
            <div className="method-form">
              <label>UPI ID</label>
              <div className="d-flex gap-2">
                <input className="form-control" value={'example@upi'} readOnly />
                <button className="btn btn-outline-secondary" onClick={() => { navigator.clipboard?.writeText('example@upi'); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? 'Copied' : 'Copy'}</button>
              </div>
              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-primary" onClick={() => navigate('/subscription')}>Pay & Return</button>
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
                    <div className="upi-id-large">example@upi</div>
                  </div>
                  <div className="upi-right-large">
                    <button className="btn btn-outline-secondary" onClick={() => { navigator.clipboard?.writeText('example@upi'); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? 'Copied' : 'Copy'}</button>
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
