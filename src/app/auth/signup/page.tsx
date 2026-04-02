'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const STATES = [
  'Tamil Nadu','Karnataka','Maharashtra','Delhi','Telangana',
  'Andhra Pradesh','Kerala','Gujarat','Rajasthan','Uttar Pradesh',
  'West Bengal','Madhya Pradesh','Punjab','Bihar','Odisha','Other',
]

export default function SignupPage() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({
    school_name:'', school_address:'', school_phone:'', school_email:'',
    city_name:'', state:'Tamil Nadu',
    admin_name:'', admin_phone:'', password:'', confirm_password:'',
  })

  function set(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))
  }
  function setPhone(k: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value.replace(/\D/g,'').slice(0,10) }))
  }

  async function register() {
    setError('')
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    const res = await fetch('/api/schools', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_name:    form.school_name,
        school_address: form.school_address,
        school_phone:   form.school_phone,
        school_email:   form.school_email,
        city_name:      form.city_name,
        state:          form.state,
        admin_name:     form.admin_name,
        admin_phone:    form.admin_phone,
        password:       form.password,
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(typeof data.error === 'string' ? data.error : 'Registration failed. Please check your details.'); return }
    router.replace('/admin/dashboard')
  }

  const valid = form.school_name && form.school_address &&
    form.school_phone.length === 10 && form.school_email &&
    form.city_name && form.admin_name &&
    form.admin_phone.length === 10 && form.password.length >= 6

  return (
    <div className="min-h-screen bg-gray-50" style={{ paddingTop: 'env(safe-area-inset-top,0px)' }}>
      <div className="bg-emerald-600 px-6 pt-10 pb-8">
        <Link href="/home" className="text-emerald-200 text-sm mb-4 block">← Back</Link>
        <div className="text-2xl font-bold text-white mb-1">Register your school</div>
        <p className="text-emerald-100 text-sm">Free to start · Takes 2 minutes</p>
      </div>

      <div className="px-5 -mt-4 pb-10">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">

          {/* School details */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">School details</p>
            <div className="space-y-3">
              <F label="School name" placeholder="e.g. Sri Lakshmi Driving School" value={form.school_name} onChange={set('school_name')} />
              <F label="Address" placeholder="Street, Area, City" value={form.school_address} onChange={set('school_address')} />
              <div className="grid grid-cols-2 gap-3">
                <F label="City" placeholder="Coimbatore" value={form.city_name} onChange={set('city_name')} />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <select value={form.state} onChange={set('state')}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <F label="School phone" placeholder="10-digit number" type="tel" maxLength={10} value={form.school_phone} onChange={setPhone('school_phone')} />
              <F label="School email" placeholder="info@yourschool.com" type="email" value={form.school_email} onChange={set('school_email')} />
            </div>
          </section>

          {/* Admin details */}
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your account (admin)</p>
            <div className="space-y-3">
              <F label="Your name" placeholder="Your full name" value={form.admin_name} onChange={set('admin_name')} />
              <F label="Your mobile number" placeholder="You'll log in with this" type="tel" maxLength={10} value={form.admin_phone} onChange={setPhone('admin_phone')} />
              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={set('password')}
                    className="w-full px-3 py-2.5 pr-14 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>
              <F label="Confirm password" placeholder="Re-enter password" type={showPass ? 'text' : 'password'} value={form.confirm_password} onChange={set('confirm_password')} />
            </div>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            onClick={register}
            disabled={!valid || loading}
            className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl text-base disabled:opacity-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {loading
              ? <><Spin /> Registering school…</>
              : 'Register & get started →'
            }
          </button>

          <p className="text-xs text-gray-400 text-center">
            Already registered?{' '}
            <Link href="/auth/login" className="text-emerald-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

function F({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-gray-400" {...props} />
    </div>
  )
}

function Spin() {
  return <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
}
