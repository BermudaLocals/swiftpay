import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#050505] text-white antialiased">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent shadow-[0_0_20px_rgba(212,175,55,0.4)]" />
        </div>
        {children}
      </body>
    </html>
  );
}
