'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../../store/useAuthStore';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/browse', label: 'Browse' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/my-list', label: 'My List' },
  { href: '/profile', label: 'Profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, userName, signOut } = useAuthStore();

  function handleSignOut() {
    signOut();
    router.push('/');
  }

  return (
    <nav className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4">
        <Link href="/" className="text-white font-black text-xl tracking-tight shrink-0">
          curate
        </Link>

        {/* Nav links — only when signed in */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-0.5 flex-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-500 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        {/* Auth */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <>
              <span className="text-xs text-zinc-500 hidden sm:block">{userName}</span>
              <button
                onClick={handleSignOut}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth?mode=signin"
                className="text-xs text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth?mode=signup"
                className="text-xs bg-white hover:bg-zinc-200 text-black px-3 py-1.5 rounded-lg font-bold transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
