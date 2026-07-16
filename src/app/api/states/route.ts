import { NextResponse } from 'next/server';
import { getStatesList } from '@/db/client';

export async function GET() {
  try {
    // { dataSource, states } — dataSource says whether these rows came from the
    // database or from the in-code fallback. The fallback is silent by design,
    // which makes a half-applied migration invisible; this is the antidote.
    const payload = await getStatesList();
    return NextResponse.json(payload);
  } catch (error) {
    console.error('API states route error:', error);
    return NextResponse.json({ error: 'Failed to fetch states list' }, { status: 500 });
  }
}
