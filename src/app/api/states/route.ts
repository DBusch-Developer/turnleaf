import { NextResponse } from 'next/server';
import { getStatesList } from '@/db/client';

export async function GET() {
  try {
    const states = await getStatesList();
    return NextResponse.json(states);
  } catch (error) {
    console.error('API states route error:', error);
    return NextResponse.json({ error: 'Failed to fetch states list' }, { status: 500 });
  }
}
