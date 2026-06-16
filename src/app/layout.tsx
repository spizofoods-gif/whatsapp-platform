import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhatsApp Platform',
  description: 'Self-hosted WhatsApp marketing',
};

const NAV = [
  { href: '/', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10' },
  { href: '/chat', label: 'Live Chat', icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z' },
  { href: '/contacts', label: 'Contacts', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 7a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75' },
  { href: '/campaigns', label: 'Campaigns', icon: 'M22 2L11 13 M22 2l-7 20-4-9-9-4 20-7z' },
  { href: '/templates', label: 'Templates', icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8' },
  { href: '/messages', label: 'Messages', icon: 'M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z' },
  { href: '/chatbot', label: 'Chatbot Rules', icon: 'M3 4h18v16H3z M9 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M15 12a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M12 16c1.5 0 2.5-.8 3-2 M9 16c-1.5 0-2.5-.8-3-2' },
  { href: '/chatbot-builder', label: 'Flow Builder', icon: 'M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5' },
  { href: '/settings', label: 'Settings', icon: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <aside className="sidebar">
          <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#fff' }}>W</div>
              <div><div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>WhatsApp</div><div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11 }}>Marketing Platform</div></div>
            </div>
          </div>
          <nav style={{ padding: '16px 0' }}>
            {NAV.map(item => (
              <a key={item.href} href={item.href} className="nav-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon.split(' ').map((p, i) => <path key={i} d={p} />)}
                </svg>
                {item.label}
              </a>
            ))}
          </nav>
          <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16 }}>
            <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 14, color: 'rgba(255,255,255,.6)', fontSize: 11, textAlign: 'center', lineHeight: 1.6 }}>
              <div style={{ color: '#25D366', fontWeight: 600, marginBottom: 4 }}>⚡ Self-Hosted</div>
              No middleman. Pay only Meta directly.
            </div>
          </div>
        </aside>
        <main className="main-content">{children}</main>
      </body>
    </html>
  );
}