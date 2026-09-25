import type { Metadata } from 'next';
import { Newsreader, Public_Sans } from 'next/font/google';
import Header from '@/components/Header';
import './globals.css';

const display = Newsreader({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-display' });
const body = Public_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-body' });

export const metadata: Metadata = {
  title: { default: 'Weighed — expert-scored product rankings', template: '%s · Weighed' },
  description: 'Products scored by credentialed experts and weighed against verified-purchase reviews. No brand can pay for placement.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <Header />
        {children}
        <footer>
          <div className="wrap">
            Weighed is independently owned. Rankings are never sold. Not medical advice — talk to your doctor before starting a supplement.
          </div>
        </footer>
      </body>
    </html>
  );
}
