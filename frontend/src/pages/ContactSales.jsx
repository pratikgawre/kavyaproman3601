import { useState, useEffect } from 'react'
import './ContactSales.css'
import { FiX, FiUser, FiMail, FiPhone, FiEdit3, FiServer, FiPaperclip } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'

const stripLeadingSpace = (value) => value.replace(/^\s+/, '')
const sanitizeEmail = (value) => stripLeadingSpace(value).replace(/[^A-Za-z@.]/g, '')
const SALES_EMAIL_DOMAIN = 'kavyainfoweb.com'
const isValidSalesEmail = (value = '') => {
  const parts = value.split('@')
  if (parts.length !== 2) return false
  const [local, domain] = parts
  if (!local || !domain) return false
  if (!/^[A-Za-z.]+$/.test(local)) return false
  return domain.toLowerCase() === SALES_EMAIL_DOMAIN
}
const preventLeadingSpace = (e) => {
  if (e.key === ' ' && (e.currentTarget.selectionStart ?? 0) === 0) e.preventDefault()
}

export default function ContactSales(){
  const API_BASE_ROOT = import.meta.env.VITE_API_BASE || 'http://localhost:8080'
  const API_BASE = API_BASE_ROOT + '/api/contact'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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
  const [emailError, setEmailError] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [fileError, setFileError] = useState('')

  // If the user clicks the verification link in the email it will open
  // /contact-sales?email=...&code=... -> auto-verify here and show a verified badge
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const e = params.get('email');
      const code = params.get('code');
      if (e && code) {
        const parsedEmail = sanitizeEmail(decodeURIComponent(e));
        if (!isValidSalesEmail(parsedEmail)) return;
        setEmail(parsedEmail);
        setVerificationSent(true);
        (async () => {
          try {
            const r = await fetch(API_BASE + '/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: parsedEmail, code })
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
    const first = firstName.trim()
    const last = lastName.trim()
    if (!first) return 'Please enter your first name'
    if (!last) return 'Please enter your last name'
    if (!/^[A-Za-z]+$/.test(first)) return 'First name can only contain letters'
    if (!/^[A-Za-z]+$/.test(last)) return 'Last name can only contain letters'
    if (!isValidSalesEmail(email)) return 'Please use your kavyainfoweb.com email with no numbers before the @'
    if (!/^[0-9]{10}$/.test(phone)) return 'Please enter a valid 10-digit phone number'
    if (!message || message.trim().length < 10) return 'Please enter a message (min 10 chars)'
    if (fileError) return fileError
    if (!verified) return 'Please verify your email before submitting'
    return null
  }

  const sanitizeAlpha = (value) => stripLeadingSpace(value).replace(/[^A-Za-z]/g, '')

  const handleFirstNameChange = (e) => {
    setFirstName(sanitizeAlpha(e.target.value))
  }

  const handleLastNameChange = (e) => {
    setLastName(sanitizeAlpha(e.target.value))
  }

  const handleEmailChange = (e) => {
    const raw = e.target.value
    const sanitized = sanitizeEmail(raw)
    setEmail(sanitized)
    setVerificationSent(false)
    setVerified(false)
    setVerificationCode('')
    if (raw !== sanitized) {
      setEmailError('Email can only include letters, dots, and the @ symbol')
      return
    }
    const emailParts = sanitized.split('@')
    if (emailParts.length > 2) {
      setEmailError('Email can only include one @ symbol')
      return
    }
    const domainPart = emailParts[1] || ''
    if (domainPart && domainPart.toLowerCase() !== SALES_EMAIL_DOMAIN) {
      setEmailError('Email must end with @kavyainfoweb.com')
      return
    }
    setEmailError('')
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) {
      setAttachment(null)
      setFileError('')
      return
    }
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]
    const maxBytes = 5 * 1024 * 1024
    if (!allowedTypes.includes(file.type)) {
      setAttachment(null)
      setFileError('Only PDF, Word, or image files are allowed')
      return
    }
    if (file.size > maxBytes) {
      setAttachment(null)
      setFileError('File size must be 5MB or less')
      return
    }
    setFileError('')
    setAttachment(file)
  }

  async function handleSubmit(e){
    e.preventDefault();
    setApiError(null)
    const err = validateAll();
    if (err) { setApiError(err); return }

    setSending(true)
    try {
      const formData = new FormData()
      const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
      formData.append('name', fullName)
      formData.append('email', email.trim())
      formData.append('countryCode', country)
      formData.append('phone', phone)
      formData.append('message', message.trim())
      formData.append('verificationCode', verificationCode)
      if (attachment) formData.append('file', attachment)
      const res = await fetch(API_BASE + '/submit', { method: 'POST', body: formData })
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
          <div className="name-row">
            <label className="field">
              <FiUser className="field-icon" />
              <input placeholder="First Name" value={firstName} onChange={handleFirstNameChange} required />
            </label>
            <label className="field">
              <FiUser className="field-icon" />
              <input placeholder="Last Name" value={lastName} onChange={handleLastNameChange} required />
            </label>
          </div>

          <label className="field">
            <FiMail className="field-icon" />
            <input placeholder="Email Address" type="email" value={email} onChange={handleEmailChange} onKeyDown={preventLeadingSpace} required />
            {verified && (
              <span style={{marginLeft:8,background:'#ecfdf5',color:'#065f46',padding:'6px 8px',borderRadius:6,fontSize:12,fontWeight:600}}>Verified</span>
            )}
            <button type="button" className="submit-btn" style={{marginLeft:8, padding:'6px 10px'}} onClick={async ()=>{
              setApiError(null)
              if (!isValidSalesEmail(email)) { setApiError('Email must be on @kavyainfoweb.com with no numbers before the @'); return }
              try {
                const r = await fetch(API_BASE + '/send-verification', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ email }) })
                const j = await r.json()
                if (!r.ok) throw new Error(j?.error || 'failed')
                setVerificationSent(true)
                alert('Verification code sent to your email. Please check and enter the code below.')
              } catch (err) { setApiError(err.message) }
            }}>Verify Email</button>
          </label>
          {emailError && <div className="contact-error">{emailError}</div>}

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
            <textarea placeholder="Your Message" value={message} onChange={(e)=>setMessage(e.target.value)} rows={4} />
          </label>

          <label className="field">
            <FiPaperclip className="field-icon" />
            <input
              type="file"
              accept=".pdf,.doc,.docx,image/png,image/jpeg,image/gif"
              onChange={handleFileChange}
            />
          </label>
          {attachment && !fileError && (
            <div className="contact-file">Attached: {attachment.name}</div>
          )}
          {fileError && <div className="contact-error">{fileError}</div>}

          <button className="submit-btn" type="submit">Submit</button>
          <div className="help-text">We'll get back to you shortly.</div>
        </form>
      </div>
    </div>
  )
}
