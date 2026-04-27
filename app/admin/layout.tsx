'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode, CSSProperties } from 'react'

type AdminLayoutProps = {
  children: ReactNode
}

type NavItem = {
  href: string
  label: string
}

function navLinkStyle(active: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 12px',
    borderRadius: 12,
    border: active
      ? '1px solid rgba(59,130,246,0.40)'
      : '1px solid rgba(255,255,255,0.12)',
    background: active
      ? 'rgba(59,130,246,0.18)'
      : 'rgba(255,255,255,0.06)',
    color: active ? '#dbeafe' : '#e6e6e6',
    textDecoration: 'none',
    fontWeight: 800,
    fontSize: 14,
    transition: 'all 0.18s ease',
    boxShadow: active ? '0 0 0 1px rgba(59,130,246,0.14)' : 'none',
  }
}

function logoutButtonStyle(): CSSProperties {
  return {
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.08)',
    color: '#e6e6e6',
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 14,
  }
}

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/admin') {
    return pathname === '/admin'
  }

  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    { href: '/admin', label: '🏠 Genel Bakış' },
    { href: '/admin/alarms', label: '⚠️ Alarmlar' },
    { href: '/admin/billing', label: '💳 Ödemeler' },
    { href: '/admin/revenue', label: '💰 Gelir' },
    { href: '/admin/analytics', label: '📊 Analitik' },
    { href: '/admin/create', label: '➕ Yeni Ürün' },
  ]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0b0f17',
        color: '#e6e6e6',
        fontFamily: 'system-ui',
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backdropFilter: 'blur(10px)',
          background: 'rgba(11,15,23,0.86)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: '0 auto',
            padding: '18px 24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>DPPForge</div>
              <div style={{ fontSize: 22, fontWeight: 900 }}>
                Yönetim Merkezi
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <form action="/logout" method="post" style={{ margin: 0 }}>
                <button type="submit" style={logoutButtonStyle()}>
                  Çıkış yap
                </button>
              </form>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={navLinkStyle(active)}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <main
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          padding: 24,
        }}
      >
        {children}
      </main>
    </div>
  )
}