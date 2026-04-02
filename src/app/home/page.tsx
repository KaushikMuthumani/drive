import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-5 md:px-10 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div className="text-xl font-bold text-gray-900">Drive<span className="text-emerald-600">India</span></div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 transition">Sign in</Link>
          <Link href="/auth/signup" className="bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition active:scale-95">Register free →</Link>
        </div>
      </nav>

      <section className="px-5 md:px-10 pt-14 pb-12 md:pt-20 md:pb-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-medium text-emerald-700 mb-6">
          🇮🇳 Built for Indian driving schools
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight mb-5">
          Run your driving school<br className="hidden md:block"/>
          <span className="text-emerald-600"> without the paperwork</span>
        </h1>
        <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
          Batches, attendance, RTO tracking, student progress — all in one place.
          Designed for how Indian driving schools actually operate. Start in 2 minutes.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/signup" className="bg-emerald-600 text-white font-semibold px-7 py-3.5 rounded-xl hover:bg-emerald-700 transition active:scale-95 text-base">
            Register your school — free
          </Link>
          <Link href="/auth/login" className="border border-gray-200 text-gray-700 font-semibold px-7 py-3.5 rounded-xl hover:bg-gray-50 transition text-base">
            Sign in
          </Link>
        </div>
        <p className="text-xs text-gray-400 mt-4">No credit card · No app install · Works on any phone</p>
      </section>

      <section className="px-5 md:px-10 py-12 bg-gray-50 border-y border-gray-100">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest text-center mb-2">Built around real Indian driving school operations</p>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">How this works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon:'🚗', title:'3–4 students share one car', desc:'Create a batch with one instructor, one vehicle, and a time slot. Students rotate turns driving. One session — multiple students. Exactly how you operate.' },
              { icon:'⏰', title:'Fixed slots from day one', desc:"Student picks 7 AM weekdays or 6 PM weekends at enrollment. All 22 session dates are generated automatically from the start date. No daily scheduling." },
              { icon:'✅', title:'One-tap daily attendance', desc:"Open the app each morning. See today's batches. Tap present/absent for each student. Done in 30 seconds. Session records maintained automatically." },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-14 max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Everything to run your school</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon:'👥', title:'Batch management', desc:'Instructor + vehicle + time slot + day preference. Create once, runs all month.' },
            { icon:'📋', title:'Student enrollment', desc:'Add students to batches. Send WhatsApp link for their personal tracking portal.' },
            { icon:'📅', title:'Auto-scheduled sessions', desc:'All session dates generated from start date. Zero manual scheduling ever.' },
            { icon:'✅', title:'Daily attendance', desc:'Mark all students in a batch present/absent in one screen. RTO-compliant records.' },
            { icon:'🏛️', title:'RTO tracker', desc:'LL number, test date, venue, DL status — tracked per student, updated by admin.' },
            { icon:'📱', title:'Student portal', desc:'Students see their slot, attendance count, and RTO status via a WhatsApp link.' },
            { icon:'🚘', title:'Fleet tracking', desc:'Vehicle status, service due dates, which batch each car is assigned to.' },
            { icon:'👨‍🏫', title:'Instructor dashboard', desc:"Instructors see today's batches, mark attendance, log skill progress." },
            { icon:'📊', title:'Reports', desc:'Completion rates, fee collection status, school-wide analytics.' },
          ].map(f => (
            <div key={f.title} className="p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition">
              <div className="text-2xl mb-2">{f.icon}</div>
              <p className="text-sm font-semibold text-gray-800 mb-1">{f.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 md:px-10 py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10">Get started in 4 steps</h2>
          <div className="space-y-6">
            {[
              { n:'1', title:'Register your school', desc:'School name, city, admin phone — verify with OTP. Takes 2 minutes.' },
              { n:'2', title:'Add instructors and vehicles', desc:'Add your team and fleet. Each instructor gets their own login.' },
              { n:'3', title:'Create a batch', desc:'Pick instructor, vehicle, time slot, weekday or weekend, and start date. All sessions generated automatically.' },
              { n:'4', title:'Enroll students and go', desc:'Add students to the batch. They get a WhatsApp portal link. Mark attendance daily from the app.' },
            ].map(s => (
              <div key={s.n} className="flex gap-4 items-start">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{s.n}</div>
                <div>
                  <p className="font-semibold text-gray-900">{s.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 md:px-10 py-14 max-w-3xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Simple pricing</h2>
        <p className="text-gray-500 mb-10">No hidden fees. No per-student charges.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
          <div className="border border-gray-200 rounded-2xl p-6">
            <p className="text-sm font-medium text-gray-500 mb-1">Starter</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">Free</p>
            <p className="text-sm text-gray-400 mb-5">Forever. No credit card.</p>
            <ul className="space-y-2 text-sm text-gray-600">
              {['Up to 2 active batches','Up to 30 students','All core features','Student portal links'].map(f=>(
                <li key={f} className="flex items-center gap-2"><span className="text-emerald-500">✓</span>{f}</li>
              ))}
            </ul>
          </div>
          <div className="border-2 border-emerald-500 rounded-2xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">Most popular</div>
            <p className="text-sm font-medium text-gray-500 mb-1">School</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">₹2,999<span className="text-base font-normal text-gray-400">/mo</span></p>
            <p className="text-sm text-gray-400 mb-5">Unlimited everything.</p>
            <ul className="space-y-2 text-sm text-gray-600">
              {['Unlimited batches & students','Multi-instructor','WhatsApp notifications','RTO document tracking','Fee collection reports','Priority support'].map(f=>(
                <li key={f} className="flex items-center gap-2"><span className="text-emerald-500">✓</span>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-5 py-14 bg-emerald-600 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Ready to modernise your driving school?</h2>
        <p className="text-emerald-100 mb-7 text-sm md:text-base">Start free — no credit card, no commitment.</p>
        <Link href="/auth/signup" className="bg-white text-emerald-700 font-bold px-8 py-3.5 rounded-xl hover:bg-emerald-50 transition text-base inline-block active:scale-95">
          Register your school free →
        </Link>
      </section>

      <footer className="px-5 py-8 border-t border-gray-100 text-center">
        <div className="text-base font-bold text-gray-900 mb-1">Drive<span className="text-emerald-600">India</span></div>
        <p className="text-xs text-gray-400 mb-4">Driving school management software built for India</p>
        <div className="flex justify-center gap-5">
          <Link href="/auth/login" className="text-xs text-gray-400 hover:text-gray-600">Sign in</Link>
          <Link href="/auth/signup" className="text-xs text-gray-400 hover:text-gray-600">Register school</Link>
        </div>
      </footer>
    </div>
  )
}
