import { useLocation, useNavigate } from 'react-router-dom'
import { FiStar } from 'react-icons/fi'
import './FreePlan.css'

export default function FreePlan() {
  const navigate = useNavigate()
  const location = useLocation()
  const planFromState = location?.state?.plan || 'free'

  function handleUpgrade() {
    navigate('/subscription', { state: { highlightPlan: 'professional', scrollToPlan: true } })
  }

  return (
    <div className="free-plan-root">
      <div className="free-plan-card">
        <div className="free-plan-icon" aria-hidden="true">
          <FiStar size={40} />
        </div>
        <h1>You&apos;re on the Free Plan</h1>
        <p className="subtitle">This is your current plan.</p>

        <div className="free-plan-box">
          <div className="free-row">
            <span className="label">Current Plan:</span>
            <span className="value">{String(planFromState).charAt(0).toUpperCase() + String(planFromState).slice(1)}</span>
          </div>
          <div className="free-copy">
            Ready to unlock more features? <strong>Upgrade</strong> to a premium plan and get access to advanced tools and capabilities.
          </div>
          <button className="btn free-upgrade-btn" onClick={handleUpgrade}>Upgrade</button>
        </div>
      </div>
    </div>
  )
}
