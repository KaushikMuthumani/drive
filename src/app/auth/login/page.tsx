'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [phone,    setPhone]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [checking, setChecking] = useState(true)
  const [error,    setError]    = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.authenticated) router.replace(d.user.role === 'admin' ? '/admin/dashboard' : '/instructor/today')
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  async function login() {
    setError(''); setLoading(true)
    const res  = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Incorrect phone or password'); return }
    router.replace(data.user.role === 'admin' ? '/admin/dashboard' : '/instructor/today')
  }

  if (checking) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-2xl font-bold text-slate-900 mb-1">
            Drive<span className="text-green-600">India</span>
          </div>
          <p className="text-sm text-slate-500">Sign in to your school dashboard</p>
        </div>

        {/* Form */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mobile number</label>
            <div className="flex gap-2">
              <div className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-500 flex-shrink-0">+91</div>
              <input
                type="tel" inputMode="numeric" maxLength={10} autoFocus
                placeholder="10-digit number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                onKeyDown={e => e.key === 'Enter' && document.getElementById('pwd')?.focus()}
                className="flex-1 px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                id="pwd"
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && login()}
                className="w-full px-3 py-2.5 pr-14 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium">
                {showPass ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            onClick={login}
            disabled={phone.length !== 10 || !password || loading}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-green-700 transition disabled:opacity-40 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Signing in…</>
              : 'Sign in'
            }
          </button>
        </div>

        <p className="text-center text-sm text-slate-400 mt-4">
          New school?{' '}
          <Link href="/auth/signup" className="text-green-600 font-medium hover:underline">Register free</Link>
        </p>
      </div>
    </div>
  )
}
