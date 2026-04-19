'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Navigation from '@/components/ui/Navigation';
import Footer from '@/components/ui/Footer';

const CodexLoader = dynamic(() => import('./CodexLoader'), { ssr: false });

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
