import './globals.css';

export const metadata = {
  title: 'Curate — Smart Streaming',
  description: 'AI-powered streaming subscription optimizer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className="text-zinc-100 min-h-screen antialiased"
        style={{ background: '#09090b', position: 'relative' }}
      >
        {/* Background layer — fixed to viewport so bars/blooms stay anchored */}
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {/* Dot grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(55,138,221,0.45) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
              maskImage:
                'radial-gradient(ellipse 120% 120% at 50% 50%, transparent 35%, black 50%, black 65%, transparent 100%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 120% 120% at 50% 50%, transparent 35%, black 50%, black 65%, transparent 100%)',
            }}
          />
          {/* Top-right bloom — center inside viewport so gradient is visible */}
          <div
            style={{
              position: 'absolute',
              width: 500,
              height: 500,
              borderRadius: '50%',
              top: -120,
              right: -120,
              pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(55,138,221,0.15) 0%, transparent 70%)',
            }}
          />
          {/* Bottom-left bloom */}
          <div
            style={{
              position: 'absolute',
              width: 400,
              height: 400,
              borderRadius: '50%',
              bottom: -80,
              left: -80,
              pointerEvents: 'none',
              background: 'radial-gradient(circle, rgba(24,95,165,0.22) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Top bar — above nav so it's always visible */}
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            zIndex: 50,
            pointerEvents: 'none',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(55,138,221,0.55) 35%, rgba(55,138,221,0.55) 65%, transparent 100%)',
          }}
        />
        {/* Bottom bar */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 1,
            zIndex: 50,
            pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent, rgba(55,138,221,0.18), transparent)',
          }}
        />

        {/* Content — above the background layer */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
