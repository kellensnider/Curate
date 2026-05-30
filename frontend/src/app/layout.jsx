import './globals.css';

export const metadata = {
  title: 'Curate — Smart Streaming',
  description: 'AI-powered streaming subscription optimizer',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
