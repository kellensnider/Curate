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
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 48,
        background: '#09090b',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 24,
        paddingRight: 24,
      }}
    >
      <Link
        href={HOME_ROUTE}
        style={{
          color: 'white',
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}
      >
        curate
      </Link>

      {isAuthenticated && (
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flex: 1, marginLeft: 16 }}>
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  fontSize: 12,
                  color: active ? 'white' : 'rgba(255,255,255,0.4)',
                  textDecoration: 'none',
                  padding: '3px 10px',
                  borderRadius: 20,
                  background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {isAuthenticated ? (
          <>
            <span
              className="hidden sm:block"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}
            >
              {userName}
            </span>
            <button
              onClick={handleSignOut}
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.25)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth?mode=signin"
              style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                padding: '3px 10px',
                borderRadius: 20,
              }}
            >
              Log in
            </Link>
            <Link
              href="/auth?mode=signup"
              style={{
                fontSize: 12,
                background: 'white',
                color: 'black',
                fontWeight: 700,
                textDecoration: 'none',
                padding: '4px 12px',
                borderRadius: 20,
              }}
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
