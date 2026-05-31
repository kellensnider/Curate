'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore';

const HOME_ROUTE = '/';
const DASHBOARD_ROUTE = '/dashboard';

const NAV_LINKS = [
  { href: '/browse', label: 'Browse' },
  { href: DASHBOARD_ROUTE, label: 'Dashboard' },
  { href: '/my-list', label: 'My List' },
];

function navLinkStyle(active: boolean) {
  return {
    fontSize: 14,
    color: active ? 'white' : 'rgba(255,255,255,0.4)',
    textDecoration: 'none',
    padding: '4px 12px',
    borderRadius: 20,
    background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
    transition: 'background 0.15s, color 0.15s',
  };
}

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, userName, hydrateUser } = useAuthStore();

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  const profileActive = pathname === '/profile';

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: 60,
        background: '#09090b',
        borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 28,
        paddingRight: 28,
      }}
    >
      <Link
        href={HOME_ROUTE}
        style={{
          color: 'white',
          fontWeight: 700,
          fontSize: 17,
          textDecoration: 'none',
          flexShrink: 0,
          letterSpacing: '-0.01em',
        }}
      >
        curate
      </Link>

      {isAuthenticated && (
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 2, flex: 1, marginLeft: 20 }}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} style={navLinkStyle(pathname === link.href)}>
              {link.label}
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        {isAuthenticated ? (
          <Link
            href="/profile"
            className="hidden sm:block"
            style={navLinkStyle(profileActive)}
          >
            {userName}
          </Link>
        ) : (
          <>
            <Link
              href="/auth?mode=signin"
              style={{
                fontSize: 14,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                padding: '4px 12px',
                borderRadius: 20,
              }}
            >
              Log in
            </Link>
            <Link
              href="/auth?mode=signup"
              style={{
                fontSize: 14,
                background: 'white',
                color: 'black',
                fontWeight: 700,
                textDecoration: 'none',
                padding: '5px 14px',
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
