import './globals.css';

export const metadata = { title: 'SwiftPay Global | Premium Remittance' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-white selection:bg-[#D4AF37] selection:text-black">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          {/* Volcanic Crack Glow Effect */}
          <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-[#D4AF37] opacity-10 blur-[180px] rounded-full" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent shadow-[0_0_15px_#D4AF37]" />
        </div>
        <nav className="border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <img src="/logo-placeholder.svg" alt="logo-placeholder" className="h-10" />
            <div className="flex gap-8 text-sm font-medium uppercase tracking-widest text-gray-400">
              <a href="/" className="hover:text-[#D4AF37] transition-colors">Vision</a>
              <a href="/demo" className="hover:text-[#D4AF37] transition-colors">Demo</a>
              <a href="/dashboard" className="text-[#D4AF37] border-b border-[#D4AF37]">Portal</a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
