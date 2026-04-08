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
          padding: '20px 30px',
        }}
      >
        {/* iMessage conversation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '1100px', marginBottom: '20px' }}>
          {/* Incoming */}
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#1a3a5c',
              padding: '32px 48px',
              borderRadius: '40px 40px 40px 8px',
              fontSize: '56px',
              fontWeight: 600,
              lineHeight: 1.2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}>
              Agents talking via iMessage?
            </div>
          </div>
          {/* Outgoing */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{
              background: '#378ADD',
              color: '#ffffff',
              padding: '32px 48px',
              borderRadius: '40px 40px 8px 40px',
              fontSize: '56px',
              fontWeight: 700,
              lineHeight: 1.2,
              boxShadow: '0 4px 24px rgba(55,138,221,0.4)',
            }}>
              You got it. 💬
            </div>
          </div>
        </div>

        {/* Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
          <span style={{ color: '#fff', fontSize: '52px', fontWeight: 800, letterSpacing: '-0.03em' }}>
            The iMessage Internet Protocol
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.8)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.5)' }} />
              <div style={{ width: '12px', height: '12px', borderRadius: '6px', background: 'rgba(255,255,255,0.25)' }} />
            </div>
            <span style={{ color: '#fff', fontSize: '52px', fontWeight: 800, letterSpacing: '-0.03em' }}>
              Vernacular
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
