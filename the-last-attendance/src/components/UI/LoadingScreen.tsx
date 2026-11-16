export function LoadingScreen({ title, subtitle, tip }: { title: string; subtitle: string; tip?: string }) {
  return (
    <div className="loading">
      <div>
        <div style={{ color: 'var(--muted)', letterSpacing: '0.4em', fontSize: 11 }}>{subtitle.toUpperCase()}</div>
        <div style={{ fontFamily: 'var(--font-title)', fontSize: 40, marginTop: 10 }}>{title}</div>
        <div className="bar"><div /></div>
        {tip && <div className="tip">{tip}</div>}
      </div>
    </div>
  );
}
