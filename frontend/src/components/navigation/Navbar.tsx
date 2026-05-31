'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

const HOME_ROUTE = '/';
const DASHBOARD_ROUTE = '/dashboard';

const NAV_LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: DASHBOARD_ROUTE, label: 'Dashboard' },
  { href: '/my-list', label: 'My List' },
  { href: '/profile', label: 'Profile' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, userName, signOut, hydrateUser } = useAuthStore();

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  async function handleSignOut() {
    await signOut();
    router.push(HOME_ROUTE);
  }

  return (
    <nav className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-5">
        <Link href={HOME_ROUTE} className="text-white font-black text-2xl tracking-tight shrink-0">
          curate
        </Link>

        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1 flex-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-4 shrink-0">
          {isAuthenticated ? (
            <>
              <span className="text-sm text-zinc-400 hidden sm:block">{userName}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth?mode=signin"
                className="text-sm text-zinc-300 hover:text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/auth?mode=signup"
                className="text-sm bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-lg font-bold transition-colors"
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
