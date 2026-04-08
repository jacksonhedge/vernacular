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
          padding: '30px 40px',
        }}
      >
        {/* iMessage conversation — BIG, tight spacing */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1000px', marginBottom: '24px' }}>
          {/* Incoming — with iMessage tail on left */}
          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', gap: '0' }}>
            <div style={{
              width: '20px', height: '20px', background: 'rgba(255,255,255,0.95)',
              borderRadius: '0 0 0 20px', marginRight: '-10px', marginBottom: '2px',
            }} />
            <div style={{
              background: 'rgba(255,255,255,0.95)',
              color: '#1a3a5c',
              padding: '30px 44px',
              borderRadius: '36px 36px 36px 4px',
              fontSize: '52px',
              fontWeight: 600,
              lineHeight: 1.25,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            }}>
              Agents talking via iMessage?
            </div>
          </div>
          {/* Outgoing — with iMessage tail on right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', gap: '0' }}>
            <div style={{
              background: '#378ADD',
              color: '#ffffff',
              padding: '30px 44px',
              borderRadius: '36px 36px 4px 36px',
              fontSize: '52px',
              fontWeight: 700,
              lineHeight: 1.25,
              boxShadow: '0 4px 24px rgba(55,138,221,0.4)',
            }}>
              You got it. 💬
            </div>
            <div style={{
              width: '20px', height: '20px', background: '#378ADD',
              borderRadius: '0 0 20px 0', marginLeft: '-10px', marginBottom: '2px',
            }} />
          </div>
        </div>

        {/* Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '7px', background: '#fff' }} />
            <div style={{ width: '14px', height: '14px', borderRadius: '7px', background: 'rgba(255,255,255,0.6)' }} />
            <div style={{ width: '14px', height: '14px', borderRadius: '7px', background: 'rgba(255,255,255,0.3)' }} />
          </div>
          <span style={{ color: '#fff', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Vernacular
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '24px', fontWeight: 500 }}>
            The iMessage Internet Protocol
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
