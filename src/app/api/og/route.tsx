import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0d1f3c 0%, #1a3a5c 40%, #2e6494 70%, #5a9fd4 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '40px 60px',
        }}
      >
        {/* iMessage conversation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '700px', marginBottom: '40px' }}>
          {/* Incoming */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#1a3a5c',
              padding: '18px 28px',
              borderRadius: '24px 24px 24px 6px',
              fontSize: '32px',
              fontWeight: 600,
              maxWidth: '80%',
              lineHeight: 1.4,
            }}>
              Agents talking via iMessage?
            </div>
          </div>
          {/* Outgoing */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              background: '#378ADD',
              color: '#ffffff',
              padding: '18px 28px',
              borderRadius: '24px 24px 6px 24px',
              fontSize: '32px',
              fontWeight: 700,
              maxWidth: '80%',
              lineHeight: 1.4,
            }}>
              You got it. 💬
            </div>
          </div>
        </div>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: '#fff' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.6)' }} />
            <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.3)' }} />
          </div>
          <span style={{ color: '#fff', fontSize: '28px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Vernacular
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '22px', fontWeight: 500 }}>
            — The iMessage Internet Protocol
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
