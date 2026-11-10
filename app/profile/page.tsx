'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Mail, Phone, MapPin, CreditCard, ShieldCheck, LogOut, CheckCircle2, Save } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [card, setCard] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aurafinds_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setName(parsed.name || '');
        setEmail(parsed.email || '');
        setPhone(parsed.phone || '+1 (555) 019-2834');
        setAddress(parsed.address || '742 Evergreen Terrace, Springfield');
        setCard(parsed.card || '•••• •••• •••• 4242');
      } else {
        // Fallback default profile if not logged in
        setUser({ name: 'Guest User', email: 'guest@aurafinds.com' });
        setPhone('+1 (555) 019-2834');
        setAddress('742 Evergreen Terrace, Springfield');
        setCard('•••• •••• •••• 4242');
      }
    } catch (err) {}
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = { ...user, name, email, phone, address, card };
    localStorage.setItem('aurafinds_user', JSON.stringify(updated));
    setUser(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSignOut = () => {
    localStorage.removeItem('aurafinds_user');
    localStorage.removeItem('aurafinds_token');
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] text-[#1D1D1F] flex flex-col font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Header */}
      <header className="sticky top-4 z-50 mx-4 sm:mx-8">
        <div className="max-w-5xl mx-auto backdrop-blur-[32px] bg-white/70 border border-white/80 shadow-[0_16px_40px_rgb(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] rounded-3xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center text-white font-bold text-lg shadow">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-none">AuraFinds</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-600 font-extrabold mt-0.5">User Profile & Settings</span>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-slate-700 hover:text-slate-900">
              Back to Storefront
            </Link>
            <button
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-all shadow"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Profile Container */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-10 space-y-8 flex-1">
        
        {/* Profile Banner */}
        <div className="backdrop-blur-xl bg-white/80 border border-white/90 rounded-[36px] p-6 sm:p-10 shadow-[0_20px_50px_rgba(0,0,0,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] flex flex-col sm:flex-row items-center gap-6">
          <div className="w-20 h-20 rounded-3xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-xl">
            {name ? name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl font-black text-slate-900">{name || 'AuraFinds Member'}</h1>
              <span className="px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified Member
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{email || 'member@aurafinds.com'}</p>
          </div>
        </div>

        {/* Success Alert */}
        {savedSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4" /> Profile, address, and payment settings updated successfully!
          </div>
        )}

        {/* Edit Profile & Details Form */}
        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Personal Info */}
          <div className="backdrop-blur-xl bg-white/80 border border-white/90 rounded-[32px] p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <User className="w-4 h-4 text-slate-700" /> Personal Details
            </h3>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-white/90 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/90 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Mobile Phone Number</label>
              <div className="relative flex items-center">
                <Phone className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 019-2834"
                  className="w-full pl-10 pr-4 py-3 bg-white/90 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Shipping & Payment Info */}
          <div className="backdrop-blur-xl bg-white/80 border border-white/90 rounded-[32px] p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
              <MapPin className="w-4 h-4 text-slate-700" /> Delivery & Payment
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Default Shipping Address</label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address, City, ZIP"
                  className="w-full pl-10 pr-4 py-3 bg-white/90 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Saved Card Details</label>
              <div className="relative flex items-center">
                <CreditCard className="absolute left-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                  placeholder="•••• •••• •••• 4242"
                  className="w-full pl-10 pr-4 py-3 bg-white/90 border border-slate-200 rounded-2xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="pt-2">
              <span className="text-[10px] text-slate-400 block mb-3">🔒 Secured with Apple Pay, Google Pay & Stripe 256-bit encryption.</span>
            </div>
          </div>

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl shadow-[0_10px_25px_rgba(0,0,0,0.2)] transition-all hover:scale-[1.01] flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Profile Changes
            </button>
          </div>
        </form>

      </main>

      {/* Footer */}
      <footer className="backdrop-blur-xl bg-white/60 border-t border-slate-200/80 py-10 px-4 sm:px-8 mt-12 text-center text-xs text-slate-500 shadow-inner">
        <p>© 2026 AuraFinds Storefront. Apple Liquid Glass 3D Edition. All rights reserved.</p>
      </footer>
    </div>
  );
}
