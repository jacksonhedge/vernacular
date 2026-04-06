'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#f0f2f5', fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '40px', maxWidth: 420,
        textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1c1c1e', marginBottom: 8 }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 14, color: '#8e8e93', marginBottom: 24, lineHeight: 1.5 }}>
          The dashboard encountered an error. This usually fixes itself with a refresh.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => {
            // Clear potentially corrupted localStorage
            try {
              localStorage.removeItem('vernacular_open_columns');
            } catch { /* silent */ }
            reset();
          }} style={{
            padding: '12px 24px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #378ADD, #2B6CB0)',
            color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Try Again
          </button>
          <button onClick={() => window.location.reload()} style={{
            padding: '12px 24px', borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.1)', background: '#fff',
            color: '#1c1c1e', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            Hard Refresh
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#bbb', marginTop: 16 }}>
          {error.message}
        </p>
      </div>
    </div>
  );
}
