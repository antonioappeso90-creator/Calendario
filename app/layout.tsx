import './globals.css';

export const viewport = {
  themeColor: '#0f172a',
};

export const metadata = {
  title: 'Calendario Turni',
  description: 'App gestione turni con Next.js 16',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="antialiased selection:bg-blue-100">
        {children}
      </body>
    </html>
  );
}
