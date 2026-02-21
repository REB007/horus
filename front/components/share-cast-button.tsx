'use client';

import { Share2 } from 'lucide-react';
import { shareCast } from '@/lib/farcaster';

interface ShareCastButtonProps {
  question: string;
  marketAddress: string;
  tokenSymbol: string;
}

export function ShareCastButton({ question, marketAddress, tokenSymbol }: ShareCastButtonProps) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://horus.vercel.app';
  const marketUrl = `${appUrl}/market/${marketAddress}`;
  const text = `🔮 ${question}\n\nPredict on $${tokenSymbol} now on Horus!`;

  return (
    <button
      onClick={() => shareCast(text, marketUrl)}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[#8B5CF6] border border-[rgba(139,92,246,0.4)] rounded-lg hover:bg-[rgba(139,92,246,0.1)] transition-colors"
      title="Share on Farcaster"
    >
      <Share2 className="h-4 w-4" />
      Share
    </button>
  );
}
