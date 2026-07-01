import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'

export default function RegisterPending() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'#f2f3f4', padding:24 }}>
      <div style={{ background:'#fff', borderRadius:20, padding:'48px 40px', maxWidth:480, width:'100%',
        textAlign:'center', boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#ccff00',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px' }}>
          <CheckCircle2 size={32} color='#243800'/>
        </div>
        <h1 style={{ fontSize:22, fontWeight:900, color:'#0a1f15', margin:'0 0 12px' }}>
          Registration Submitted!
        </h1>
        <p style={{ fontSize:15, color:'#555', lineHeight:1.7, margin:'0 0 10px' }}>
          Thank you for registering with FeaziMove. Your application has been received and is currently under review.
        </p>
        <p style={{ fontSize:15, color:'#555', lineHeight:1.7, margin:'0 0 32px' }}>
          Our team will verify your details and documents within <strong>24 hours</strong>. You will receive an email notification once your account is approved.
        </p>
        <button onClick={() => navigate('/login')}
          style={{ width:'100%', padding:'14px', borderRadius:50, background:'#ccff00',
            color:'#243800', fontWeight:800, fontSize:16, border:'none', cursor:'pointer', fontFamily:'inherit' }}>
          Back to Login
        </button>
      </div>
    </div>
  )
}
