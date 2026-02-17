'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BarChart3 } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-yellow-600/30 bg-gray-900">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-yellow-500">
              <BarChart3 className="h-6 w-6" />
              Horus
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/" className="text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors">
                Markets
              </Link>
              <Link href="/portfolio" className="text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors">
                Portfolio
              </Link>
              <Link href="/admin" className="text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors">
                Admin
              </Link>
            </nav>
          </div>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
