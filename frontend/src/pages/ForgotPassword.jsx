import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Auth.css'
import { useAuth } from '../context/AuthContext'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080'

export default function ForgotPassword(){
  const [email,setEmail] = useState('')
  const [error,setError] = useState('')
  const navigate = useNavigate()
  const { setPendingUserId } = useAuth()

  async function submit(e){
    e.preventDefault()
    setError('')
    try{
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})
      })
      const body = await res.json()
      if(!res.ok) throw new Error(body.message||'Request failed')
      setPendingUserId(body.userId)
      alert('A reset code was sent to your email.');
      navigate('/reset-password')
    }catch(err){setError(err.message)}
  }

  return (
    <div className="auth-root">
      <form className="auth-card" onSubmit={submit}>
        <h2>Forgot password</h2>
        {error && <div className="auth-error">{error}</div>}
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="auth-btn" type="submit">Send code</button>
      </form>
    </div>
  )
}
