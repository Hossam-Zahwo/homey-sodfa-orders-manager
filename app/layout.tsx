import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'إدارة الطلبات | هومي وصدفة',
  description: 'لوحة إدارة وتأكيد الطلبات الداخلية',
  robots: { index: false, follow: false },
  applicationName: 'HOMEY & SODFA',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HOMEY & SODFA',
  },
  icons: { icon: '/icon.svg', apple: '/sodfa-app-180.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="ar" dir="rtl"><body>{children}</body></html>;
}
