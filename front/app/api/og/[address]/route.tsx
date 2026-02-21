import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  let question = 'Prediction Market';
  let tokenSymbol = '???';
  let yesPrice = '50%';
  let noPrice = '50%';
  let status = 'Active';

  try {
    const res = await fetch(`${apiUrl}/api/markets/${address}`, { next: { revalidate: 30 } });
    if (res.ok) {
      const market = await res.json();
      question = market.question || question;
      tokenSymbol = market.tokenSymbol || tokenSymbol;
      const yp = market.yesPrice ? (Number(market.yesPrice) / 100).toFixed(0) : '50';
      const np = market.noPrice ? (Number(market.noPrice) / 100).toFixed(0) : '50';
      yesPrice = `${yp}%`;
      noPrice = `${np}%`;
      status = market.resolved ? (market.yesWins ? 'YES wins' : 'NO wins') : 'Active';
    }
  } catch {
    // Use defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200',
          height: '800',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#E8C547' }}>
            Horus
          </div>
          <div style={{ fontSize: 24, color: '#666666', marginLeft: 20 }}>
            Onchain Prediction Markets
          </div>
        </div>

        {/* Token badge */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#2a2a2a',
              border: '2px solid rgba(212,175,55,0.4)',
              fontSize: 20,
              fontWeight: 700,
              color: '#E8C547',
            }}
          >
            {tokenSymbol.slice(0, 2)}
          </div>
          <div style={{ fontSize: 28, color: '#999999', marginLeft: 16 }}>
            ${tokenSymbol}
          </div>
        </div>

        {/* Question */}
        <div style={{ fontSize: 52, fontWeight: 700, color: '#ffffff', marginBottom: 48, lineHeight: 1.2 }}>
          {question}
        </div>

        {/* Prices */}
        <div style={{ display: 'flex', gap: 40, marginBottom: 40 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 48px',
              borderRadius: 16,
              backgroundColor: 'rgba(74,222,128,0.1)',
              border: '2px solid rgba(74,222,128,0.4)',
            }}
          >
            <div style={{ fontSize: 20, color: '#4ADE80', marginBottom: 8 }}>YES</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#4ADE80' }}>{yesPrice}</div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 48px',
              borderRadius: 16,
              backgroundColor: 'rgba(248,113,113,0.1)',
              border: '2px solid rgba(248,113,113,0.4)',
            }}
          >
            <div style={{ fontSize: 20, color: '#F87171', marginBottom: 8 }}>NO</div>
            <div style={{ fontSize: 48, fontWeight: 700, color: '#F87171' }}>{noPrice}</div>
          </div>
        </div>

        {/* Status */}
        <div style={{ fontSize: 24, color: '#E8C547' }}>
          {status}
        </div>
      </div>
    ),
    { width: 1200, height: 800 }
  );
}
