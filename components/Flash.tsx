export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <div className={`banner ${err ? 'msg err' : 'msg ok'}`} role="status" style={{ marginTop: 12 }}>
      {err ?? ok}
    </div>
  );
}
