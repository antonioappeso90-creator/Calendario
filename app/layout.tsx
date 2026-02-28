import './globals.css';

export const viewport = {
  themeColor: '#0f172a',
};

export const metadata = {
  title: 'Calendario Turni',
  description: 'App gestione turni e meteo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
