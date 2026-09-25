import Link from 'next/link';
import { getViewer } from '@/lib/data';

export default async function Header() {
  const viewer = await getViewer();
  const role = viewer?.profile?.role;
  return (
    <header className="topbar">
      <div className="wrap">
        <Link className="brand" href="/">Weighed<span>.</span></Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Rankings</Link>
          <Link href="/method">Method</Link>
          <Link href="/corrections">Corrections</Link>
          {viewer && <Link href="/panel">{role === 'panelist' || role === 'admin' ? 'Panel' : 'Join the panel'}</Link>}
          {role === 'admin' && <Link href="/admin">Admin</Link>}
          {viewer ? (
            <form action="/auth/signout" method="post">
              <button className="linklike" type="submit">Sign out</button>
            </form>
          ) : (
            <Link href="/login">Sign in</Link>
          )}
        </nav>
      </div>
    </header>
  );
}
