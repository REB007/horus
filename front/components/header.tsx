'use client';

import Link from 'next/link';
import { CustomConnectButton } from './custom-connect-button';
import { BarChart3 } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b-2 border-[rgba(212,175,55,0.3)] bg-[#0a0a0a]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 neo-hover">
          <div className="text-3xl font-bold text-[#E8C547]" style={{ textShadow: '2px 2px 0px rgba(212, 175, 55, 0.3)', fontFamily: 'var(--font-pirata-one), cursive' }}>
            👁️ Horus
          </div>
        </Link>

        <nav className="flex items-center justify-between flex-1 ml-8">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-[#cccccc] hover:text-[#E8C547] transition-colors font-medium"
            >
              Markets
            </Link>
            <Link
              href="/portfolio"
              className="text-[#cccccc] hover:text-[#E8C547] transition-colors font-medium"
            >
              Portfolio
            </Link>
            <Link
              href="/admin"
              className="text-[#cccccc] hover:text-[#E8C547] transition-colors font-medium"
            >
              Admin
            </Link>
          </div>
          <CustomConnectButton />
        </nav>
      </div>
    </header>
  );
}
