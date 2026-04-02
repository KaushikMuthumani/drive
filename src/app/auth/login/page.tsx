'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)
  const [error, setError]       = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.authenticated) router.replace(d.user.role === 'admin' ? '/admin/dashboard' : '/instructor/attendance')
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  async function login() {
    setError(''); setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    })
    const data = await res.json().catch(() => ({ error: 'Login failed. Server returned an invalid response.' }))
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Invalid phone or password'); return }
    router.replace(data.user.role === 'admin' ? '/admin/dashboard' : '/instructor/attendance')
  }

  if (checking) return (
    <div className="min-h-screen bg-emerald-600 flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"/>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="bg-emerald-600 px-6 pt-12 pb-10">
        <Link href="/home" className="text-emerald-200 text-sm mb-4 block">← DriveIndia</Link>
        <div className="text-2xl font-bold text-white mb-1">Sign in</div>
        <p className="text-emerald-100 text-sm">Welcome back to your school dashboard</p>
      </div>

      <div className="flex-1 px-5 -mt-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="space-y-4 mb-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile number</label>
              <div className="flex gap-2">
                <div className="bg-gray-50 border border-gray-200 rounded-xl px-3 flex items-center text-sm text-gray-600 flex-shrink-0">+91</div>
                <input
                  type="tel" inputMode="numeric" maxLength={10} autoFocus
                  placeholder="10-digit number"
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                  onKeyDown={e => e.key === 'Enter' && document.getElementById('pwd-input')?.focus()}
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="pwd-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && login()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-12 text-base focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium px-1">
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 mb-4 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

          <button onClick={login} disabled={phone.length !== 10 || !password || loading}
            className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            {loading ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/><span>Signing in…</span></> : 'Sign in →'}
          </button>

          <p className="text-xs text-gray-400 text-center mt-4">
            New school?{' '}
            <Link href="/auth/signup" className="text-emerald-600 font-medium">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
