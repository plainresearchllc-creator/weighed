import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="wrap">
      <div className="empty"><h3>That page doesn’t exist</h3><p><Link href="/">Back to the rankings</Link></p></div>
    </main>
  );
}
