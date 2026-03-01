'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Zap, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/log', label: 'Log', icon: BookOpen },
  { href: '/scan', label: 'Scan', icon: Zap },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()
  const isScan = pathname === '/scan'

  return (
    <nav className="md:hidden fixed bottom-6 left-4 right-4 z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-slate-900/90 backdrop-blur-2xl rounded-full border border-white/10 shadow-xl flex items-center justify-around px-2 py-2.5 gap-1 max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          const isCenter = href === '/scan'

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 px-4 py-3 rounded-full text-xs font-semibold transition-all min-w-[56px] min-h-[44px] touch-target',
                isCenter ? 'relative -mt-8' : ''
              )}
              aria-label={label}
            >
              <span
                className={cn(
                  'flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-full transition-all',
                  isCenter
                    ? 'hoverboard-gradient text-white shadow-lg shadow-emerald-500/30'
                    : isActive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-white/60 hover:text-white/80'
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              {!isCenter && (
                <span
                  className={cn(
                    'text-[10px]',
                    isActive ? 'text-emerald-400' : 'text-white/60'
                  )}
                >
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
