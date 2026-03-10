'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Cpu,
  BarChart2,
  Settings,
  ChevronRight,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    href: '/admin/runs',
    label: 'Search Runs',
    icon: Search,
    description: 'Browse & filter all search runs',
    badge: null,
  },
  {
    href: '/admin/jobs',
    label: 'Job Observability',
    icon: Cpu,
    description: 'Job state machine & timelines',
    badge: null,
  },
  {
    href: '/admin/ranking',
    label: 'Ranking Debugger',
    icon: BarChart2,
    description: 'Score breakdown & compare',
    badge: null,
  },
  {
    href: '/admin/config',
    label: 'Config Studio',
    icon: Settings,
    description: 'Weights, providers, flags',
    badge: 'EXP',
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-950 text-white flex flex-col h-screen sticky top-0 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">FMD</p>
            <p className="text-xs text-gray-500 mt-0.5">Enterprise Console</p>
          </div>
        </div>
      </div>

      {/* Back to app */}
      <div className="px-3 pt-3">
        <Link
          href="/"
          className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 rounded-md hover:bg-gray-800 transition-colors"
        >
          <LayoutDashboard size={13} />
          Back to App
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        <p className="px-2 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
          Modules
        </p>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors relative',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800',
              ].join(' ')}
            >
              <Icon size={15} className="flex-shrink-0" />
              <span className="flex-1 leading-none">{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-purple-600 text-white">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight size={12} className="text-blue-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-[10px] text-gray-600">FMD v0.1.0 — dev</p>
        <p className="text-[10px] text-gray-700 mt-0.5">Enterprise Console</p>
      </div>
    </aside>
  );
}
