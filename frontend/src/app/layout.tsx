import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { LanguageProvider } from '../context/LanguageContext';

export const metadata: Metadata = {
  title: 'AgriTrace — AI Multimodal Produce Freshness & Traceability Platform',
  description:
    'AI-powered fruit & vegetable freshness detection, shelf-life management, agricultural intelligence, inventory, and farm-to-consumer traceability.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#061510] text-emerald-50 antialiased min-h-screen">
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
