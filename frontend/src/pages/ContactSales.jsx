import { useState, useEffect } from 'react'
import './ContactSales.css'
import { FiX, FiUser, FiMail, FiPhone, FiEdit3, FiServer } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

export default function ContactSales(){
  const API_BASE_ROOT = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
  const API_BASE = API_BASE_ROOT + '/api/contact'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [country, setCountry] = useState('+91')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const [verificationSent, setVerificationSent] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [sending, setSending] = useState(false)
  const [apiError, setApiError] = useState(null)

  // If the user clicks the verification link in the email it will open
  // /contact-sales?email=...&code=... -> auto-verify here and show a verified badge
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const e = params.get('email');
      const code = params.get('code');
      if (e && code) {
        setEmail(decodeURIComponent(e));
        setVerificationSent(true);
        (async () => {
          try {
            const r = await fetch(API_BASE + '/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: decodeURIComponent(e), code })
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) {
              setApiError(j?.error || 'Verification failed');
            } else {
              setVerified(true);
              setVerificationCode(code);
              // remove query params to avoid re-running
              window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
            }
          } catch (err) {
            setApiError(err.message || String(err));
          }
        })();
      }
    } catch (err) { /* ignore */ }
  }, []);

  function validateAll() {
    if (!name || name.trim().length < 2) return 'Please enter your name';
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Please enter a valid email';
    if (!/^[0-9]{10}$/.test(phone)) return 'Please enter a valid 10-digit phone number';
    if (!message || message.trim().length < 10) return 'Please enter a message (min 10 chars)';
    if (!verified) return 'Please verify your email before submitting';
    return null;
  }

  async function handleSubmit(e){
    e.preventDefault();
    setApiError(null)
    const err = validateAll();
    if (err) { setApiError(err); return }

    setSending(true)
    try {
      const body = { name, email, countryCode: country, phone, message, verificationCode };
      const res = await fetch(API_BASE + '/submit', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) })
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to submit');
      alert('Thanks — your request was submitted. Our sales team will contact you.');
      navigate('/subscription')
    } catch (err) {
      setApiError(err.message)
    } finally { setSending(false) }
  }

  return (
    <div className="contact-root">
      <div className="contact-overlay" />
      <div className="contact-card" role="dialog" aria-modal="true">
        <button className="modal-close" aria-label="Close" onClick={() => navigate(-1)}><FiX /></button>
  <div className="contact-icon"> <div className="icon-inner"><FiServer size={28} /></div> </div>
        <h2 className="contact-title">Contact Sales</h2>
        <p className="contact-sub">Get in touch with our sales team for custom solutions tailored to your business needs.</p>

        <form className="contact-form" onSubmit={handleSubmit}>
          <label className="field">
            <FiUser className="field-icon" />
            <input placeholder="Full Name" value={name} onChange={(e)=>setName(e.target.value)} required />
          </label>

          <label className="field">
            <FiMail className="field-icon" />
            <input placeholder="Email Address" type="email" value={email} onChange={(e)=>{
              setEmail(e.target.value); setVerificationSent(false); setVerified(false); setVerificationCode('');
            }} required />
            {verified && (
              <span style={{marginLeft:8,background:'#ecfdf5',color:'#065f46',padding:'6px 8px',borderRadius:6,fontSize:12,fontWeight:600}}>Verified</span>
            )}
            <button type="button" className="submit-btn" style={{marginLeft:8, padding:'6px 10px'}} onClick={async ()=>{
              setApiError(null)
              if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setApiError('Enter a valid email first'); return }
              try {
                const r = await fetch(API_BASE + '/send-verification', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email }) })
                const j = await r.json()
                if (!r.ok) throw new Error(j?.error || 'failed')
                setVerificationSent(true)
                alert('Verification code sent to your email. Please check and enter the code below.')
              } catch (err) { setApiError(err.message) }
            }}>Verify Email</button>
          </label>

          {verificationSent && !verified && (
            <label className="field">
              <FiMail className="field-icon" />
              <input placeholder="Enter verification code" value={verificationCode} onChange={(e)=>setVerificationCode(e.target.value.replace(/\D/g,'').slice(0,6))} />
              <button type="button" className="submit-btn" style={{marginLeft:8,padding:'6px 10px'}} onClick={async ()=>{
                setApiError(null)
                if (!verificationCode) { setApiError('Enter the verification code'); return }
                try {
                  const r = await fetch(API_BASE + '/verify', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email, code: verificationCode }) })
                  const j = await r.json()
                  if (!r.ok) throw new Error(j?.error || 'verification failed')
                  setVerified(true)
                  alert('Email verified')
                } catch (err) { setApiError(err.message) }
              }}>Confirm</button>
            </label>
          )}

          <label className="field phone-field">
            <FiPhone className="field-icon" />
            <select
              className="country"
              aria-label="Country code"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="+91">🇮🇳 +91</option>
              <option value="+1">🇺🇸 +1</option>
              <option value="+44">🇬🇧 +44</option>
              <option value="+61">🇦🇺 +61</option>
              <option value="+49">🇩🇪 +49</option>
              <option value="+86">🇨🇳 +86</option>
            </select>

            <input
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e)=>{
                // allow only digits, strip other chars, and limit to 10 digits
                const digits = (e.target.value || '').replace(/\D/g, '').slice(0,10)
                setPhone(digits)
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              required
              aria-label="Phone number (10 digits)"
            />
          </label>

          <label className="field">
            <FiEdit3 className="field-icon" />
            <textarea placeholder="Your Message" value={message} onChange={(e)=>setMessage(e.target.value)} rows={5} />
          </label>

          <button className="submit-btn" type="submit">Submit</button>
          <div className="help-text">We'll get back to you shortly.</div>
        </form>
      </div>
    </div>
  )
}
