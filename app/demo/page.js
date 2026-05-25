"use client";
import { useState } from 'react';

export default function DemoPage() {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(500);

  return (
    <main className="max-w-4xl mx-auto py-20 px-6">
      <div className="text-center mb-16">
        <span className="text-[#D4AF37] font-bold tracking-[0.3em] uppercase text-xs">Step {step} of 3</span>
        <h1 className="text-5xl font-black mt-4 italic tracking-tighter uppercase">The SwiftPay Corridor</h1>
      </div>

      <div className="bg-[#0a0a0a] border border-[#D4AF37]/30 p-12 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group">
        {/* Floating Panel Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 to-transparent opacity-50" />
        
        <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-6">Select Remittance Volume</h2>
            <div className="relative pt-10 pb-6">
              <input 
                type="range" min="100" max="5000" step="100" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
              />
              <div className="flex justify-between mt-4 text-[#666] text-xs font-mono">
                <span>$100 BMD</span>
                <span>$5,000 BMD</span>
              </div>
            </div>
          </div>

          <div className="bg-black/50 p-8 rounded-3xl border border-white/5 text-center">
            {/* Dial/Meter Visual */}
            <div className="w-32 h-32 rounded-full border-[10px] border-[#D4AF37]/10 border-t-[#D4AF37] mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              <span className="text-2xl font-black italic">${(amount * 0.12).toFixed(0)}</span>
            </div>
            <p className="mt-4 text-[#D4AF37] text-sm uppercase font-bold tracking-widest">Calculated Fee (12%)</p>
          </div>
        </div>

        <button 
          onClick={() => window.location.href='/demo/step2'}
          className="w-full mt-12 py-5 bg-[#D4AF37] text-black font-black uppercase tracking-widest rounded-2xl hover:bg-white transition-all transform hover:-translate-y-1"
        >
          Secure Next Step
        </button>
      </div>
    </main>
  );
}
