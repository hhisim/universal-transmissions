'use client';

import Navigation from '@/components/ui/Navigation';
import Footer from '@/components/ui/Footer';
import CodexLoader from './CodexLoader';

export default function CodexPage() {
  return (
    <>
      <Navigation />
      <div style={{ paddingTop: '64px' }}>
        <CodexLoader />
      </div>
      <Footer />
    </>
  );
}
