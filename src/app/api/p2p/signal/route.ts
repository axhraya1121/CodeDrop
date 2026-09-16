import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, type, payload } = body;

    if (!roomId || !type || !payload) {
      return NextResponse.json({ error: 'roomId, type, and payload are required' }, { status: 400 });
    }

    const cleanRoomId = roomId.toLowerCase().trim();

    await prisma.p2PSignal.create({
      data: {
        roomId: cleanRoomId,
        type,
        payload,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Signal POST Error:', error);
    return NextResponse.json({ error: 'Failed to save P2P signal' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const cleanRoomId = roomId.toLowerCase().trim();

    const signals = await prisma.p2PSignal.findMany({
      where: { roomId: cleanRoomId },
      orderBy: { createdAt: 'asc' },
    });

    let offer: any = null;
    let answer: any = null;
    const candidates: any[] = [];

    for (const sig of signals) {
      if (sig.type === 'offer') {
        offer = sig.payload;
      } else if (sig.type === 'answer') {
        answer = sig.payload;
      } else if (sig.type === 'candidate') {
        candidates.push(sig.payload);
      }
    }

    return NextResponse.json({
      offer,
      answer,
      candidates,
    });
  } catch (error: any) {
    console.error('Signal GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch P2P signals' }, { status: 500 });
  }
}
