"use client";
import { useState } from 'react';

const REGIONS = {
  GH: { name: 'Ghana', color: '#FDCC00', partner: 'MTN Money', glow: 'rgba(253,204,0,0.15)' },
  PH: { name: 'Philippines', color: '#007CFF', partner: 'GCash', glow: 'rgba(0,124,255,0.15)' },
  JM: { name: 'Jamaica', color: '#E5002B', partner: 'Digicel', glow: 'rgba(229,0,43,0.15)' },
  BM: { name: 'Bermuda', color: '#D4AF37', partner: 'SwiftPay Rail', glow: 'rgba(212,175,55,0.15)' }
};

export default function DemoPage() {
  const [region, setRegion] = useState('BM');
  const [amount, setAmount] = useState(500);
  const active = REGIONS[region];

  return (
    <main className="min-h-screen flex flex-col items-center py-20 px-6 transition-all duration-1000" 
          style={{ background: `radial-gradient(circle at bottom right, ${active.glow}, #050505 60%)` }}>
      
      <div className="w-full max-w-4xl">
        <nav className="flex justify-between items-center mb-16">
          <img src="/logo-placeholder.svg" alt="logo-placeholder" className="h-10 opacity-80" />
          <div className="flex gap-2">
            {Object.keys(REGIONS).map(k => (
              <button key={k} onClick={() => setRegion(k)} 
                className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest uppercase transition-all border ${region === k ? 'border-white bg-white text-black' : 'border-white/10 text-white/40'}`}>
                {REGIONS[k].name}
              </button>
            ))}
          </div>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* VOLCANIC CONTROL PANEL */}
          <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] opacity-50" style={{ background: `linear-gradient(90deg, transparent, ${active.color}, transparent)` }} />
            
            <div className="space-y-12 relative z-10">
              <div>
                <div className="flex justify-between mb-4 items-end">
                  <span className="text-white/40 text-xs uppercase tracking-widest font-bold">Transfer Amount</span>
                  <span className="text-4xl font-black italic text-white">${amount} <span className="text-sm not-italic opacity-30 text-[#D4AF37]">BMD</span></span>
                </div>
                <input type="range" min="100" max="5000" step="100" value={amount} onChange={(e)=>setAmount(e.target.value)}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer" 
                  style={{ accentColor: active.color }} />
              </div>
              
              <div className="p-8 rounded-3xl bg-black/60 border border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">Settlement Partner</p>
                  <span className="font-black text-xl italic uppercase tracking-tighter">{active.partner}</span>
                </div>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-white/10" style={{ color: active.color }}>
                   ◈
                </div>
              </div>
            </div>
          </div>

          {/* DYNAMIC METER */}
          <div className="flex flex-col items-center justify-center p-12">
             <div className="relative w-72 h-72 flex flex-col items-center justify-center">
                {/* Circular Glow Meter */}
                <div className="absolute inset-0 rounded-full border border-white/5" />
                <div className="absolute inset-0 rounded-full border-t-4 transition-all duration-500" 
                     style={{ borderColor: active.color, transform: `rotate(${(amount/5000)*360}deg)`, filter: `drop-shadow(0 0 15px ${active.color})` }} />
                
                <span className="text-[10px] uppercase tracking-[0.5em] text-white/30 mb-2">Service Fee</span>
                <span className="text-7xl font-black italic tracking-tighter">${(amount * 0.12).toFixed(0)}</span>
                <div className="mt-4 px-3 py-1 rounded-md bg-white/5 text-[10px] font-bold text-[#00FF7F]">⚡ INSTANT SETTLEMENT</div>
             </div>
             
             <button className="mt-12 w-full py-6 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-[1.02] shadow-2xl"
               style={{ backgroundColor: active.color, color: (region === 'GH' || region === 'BM') ? '#000' : '#fff' }}>
               Confirm {active.name} Bridge
             </button>
          </div>
        </div>
      </div>
    </main>
  );
}
