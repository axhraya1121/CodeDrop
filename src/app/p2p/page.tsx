'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import P2PTransferModal from '@/components/P2PTransferModal';

function P2PContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-8 py-10 pt-24 flex flex-col items-center">
      <P2PTransferModal initialRoomId={roomId} />
    </main>
  );
}

export default function P2PPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Header />
      <Suspense fallback={
        <div className="flex justify-center py-20 text-on-surface-variant font-mono">Loading P2P Transfer...</div>
      }>
        <P2PContent />
      </Suspense>
    </div>
  );
}
