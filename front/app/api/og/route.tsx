import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1200',
          height: '800',
          backgroundColor: '#0a0a0a',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 80, fontWeight: 700, color: '#E8C547', marginBottom: 20 }}>
          Horus
        </div>
        <div style={{ fontSize: 32, color: '#999999' }}>
          Onchain Prediction Markets
        </div>
        <div style={{ fontSize: 24, color: '#666666', marginTop: 16 }}>
          Predict token prices on Base
        </div>
      </div>
    ),
    { width: 1200, height: 800 }
  );
}
