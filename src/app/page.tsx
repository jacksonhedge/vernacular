export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-['Inter']">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">V</div>
            <span className="font-semibold text-lg tracking-tight">Vernacular</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-sm text-white/50 hover:text-white/80 transition">Features</a>
            <a href="#how-it-works" className="text-sm text-white/50 hover:text-white/80 transition">How It Works</a>
            <a href="/login" className="text-sm text-white/50 hover:text-white/80 transition">Log In</a>
            <a href="/signup" className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-8">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-medium text-blue-400 tracking-wide">iMessage CRM for teams</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
            Every conversation.
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">One dashboard.</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            See all your iMessage conversations in one place. AI drafts responses.
            You approve and send. No apps for your contacts to download — just texting.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a href="/signup" className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-base transition shadow-lg shadow-blue-600/20">
              Start Free Trial
            </a>
            <a href="#demo" className="px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/20 font-medium text-base text-white/70 hover:text-white transition">
              Watch Demo
            </a>
          </div>

          {/* Hero visual — iMessage preview */}
          <div className="mt-16 max-w-3xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-1 shadow-2xl shadow-black/50">
              <div className="rounded-xl bg-[#111] overflow-hidden">
                {/* Top bar mock */}
                <div className="h-10 bg-[#1a1a1a] border-b border-white/5 flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                  </div>
                  <span className="ml-4 text-xs text-white/30 font-mono">vernacular.chat</span>
                </div>
                {/* Mock conversations */}
                <div className="flex h-80">
                  {/* Sidebar mock */}
                  <div className="w-48 border-r border-white/5 p-3 space-y-2">
                    {['Jake T.', 'Colby R.', 'Austin S.', 'Jack R.', 'Grady P.'].map((name, i) => (
                      <div key={name} className={`flex items-center gap-2 p-2 rounded-lg ${i === 0 ? 'bg-blue-500/10' : 'hover:bg-white/5'} transition cursor-pointer`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-white/40'}`}>{name[0]}</div>
                        <div>
                          <div className={`text-xs font-medium ${i === 0 ? 'text-white' : 'text-white/50'}`}>{name}</div>
                          <div className="text-[9px] text-white/25">Sigma Chi · USC</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Chat mock */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 p-4 space-y-3">
                      <div className="flex justify-end"><div className="bg-blue-500 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[200px]">Yo Jake whats up man, this is Jackson</div></div>
                      <div className="flex justify-start"><div className="bg-white/10 text-white/80 text-xs px-3 py-2 rounded-2xl rounded-bl-sm max-w-[200px]">Yo what&apos;s good bro!</div></div>
                      <div className="flex justify-end"><div className="bg-blue-500 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm max-w-[240px]">What&apos;s your Venmo? I&apos;ll send the deposit</div></div>
                      {/* AI draft */}
                      <div className="flex justify-end">
                        <div className="border border-blue-400/30 border-dashed bg-blue-500/5 text-blue-300 text-xs px-3 py-2 rounded-2xl max-w-[240px] relative">
                          <span className="absolute -top-2 right-2 text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono">AI Draft</span>
                          Sending the Venmo now, lmk when you get it!
                        </div>
                      </div>
                    </div>
                    {/* Compose mock */}
                    <div className="h-12 border-t border-white/5 flex items-center px-3 gap-2">
                      <div className="flex-1 h-7 rounded-full bg-white/5 border border-white/10" />
                      <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Built for outreach at scale</h2>
          <p className="text-center text-white/40 mb-16 max-w-xl mx-auto">Everything your team needs to manage iMessage conversations, without the complexity of enterprise software.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: '💬', title: 'Multi-conversation view', desc: 'See 4+ conversations at once. HootSuite-style columns with scrollable chat feeds.' },
              { icon: '🤖', title: 'AI-powered drafts', desc: 'Claude reads the conversation and suggests replies. You approve or edit before sending.' },
              { icon: '📱', title: 'Pure iMessage', desc: 'No Twilio, no SMS fallback. Messages send and receive through real iMessage.' },
              { icon: '👤', title: 'Contact profiles', desc: 'Click any name to see their full profile — school, org, status, campaign progress.' },
              { icon: '📢', title: 'Blast messaging', desc: 'Send the same message to 50 contacts at once. Schedule for later or send now.' },
              { icon: '📊', title: 'Campaign tracking', desc: 'See who opened, replied, completed actions. Track conversions at a glance.' },
            ].map(f => (
              <div key={f.title} className="p-6 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition">
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1.5">{f.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">How it works</h2>
          <div className="space-y-12">
            {[
              { step: '01', title: 'Connect your Mac', desc: 'Vernacular runs locally on your Mac, reading and sending iMessages through your existing Apple ID. No phone number porting.' },
              { step: '02', title: 'Import your contacts', desc: 'Pull contacts from a Google Form, CSV, or CRM. Vernacular enriches them with school, org, and campaign data.' },
              { step: '03', title: 'Start conversations', desc: 'Send individual messages or blast to a list. AI drafts responses when replies come in. You approve before anything sends.' },
            ].map(s => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-400 font-mono">{s.step}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-white/40 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to scale your outreach?</h2>
          <p className="text-white/40 mb-8 text-lg">Start your free trial. No credit card required.</p>
          <a href="/signup" className="inline-block px-10 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-lg transition shadow-lg shadow-blue-600/20">
            Get Started Free
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-white/25">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-300">V</div>
            <span>Vernacular</span>
          </div>
          <div>vernacular.chat</div>
        </div>
      </footer>
    </div>
  );
}
