import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory signaling store for WebRTC room handshakes
const signalStore: Record<string, {
  offer?: any;
  answer?: any;
  candidates: any[];
  lastUpdated: number;
}> = {};

// Clean up stale rooms older than 30 minutes every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const key of Object.keys(signalStore)) {
      if (now - signalStore[key].lastUpdated > 30 * 60 * 1000) {
        delete signalStore[key];
      }
    }
  }, 5 * 60 * 1000);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, type, payload } = body;

    if (!roomId || !type) {
      return NextResponse.json({ error: 'roomId and type are required' }, { status: 400 });
    }

    if (!signalStore[roomId]) {
      signalStore[roomId] = { candidates: [], lastUpdated: Date.now() };
    }

    signalStore[roomId].lastUpdated = Date.now();

    if (type === 'offer') {
      signalStore[roomId].offer = payload;
    } else if (type === 'answer') {
      signalStore[roomId].answer = payload;
    } else if (type === 'candidate') {
      signalStore[roomId].candidates.push(payload);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Signal POST Error:', error);
    return NextResponse.json({ error: 'Failed to process signal' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId');
    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const roomData = signalStore[roomId];
    if (!roomData) {
      return NextResponse.json({ offer: null, answer: null, candidates: [] });
    }

    // Return current room signals
    const responseData = {
      offer: roomData.offer || null,
      answer: roomData.answer || null,
      candidates: [...roomData.candidates],
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error('Signal GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch signal' }, { status: 500 });
  }
}
