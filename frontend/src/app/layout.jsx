import './globals.css';

export const metadata = {
  title: 'Curate',
  description: 'AI-powered streaming subscription manager',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
