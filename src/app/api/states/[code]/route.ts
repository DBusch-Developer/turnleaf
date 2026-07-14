import { NextResponse } from 'next/server';
import { getState } from '@/db/client';
import { stateDirectory, nationalReferrals } from '@/data/fallbackRules';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code || code.length !== 2) {
      return NextResponse.json({ error: 'Invalid state code' }, { status: 400 });
    }

    const stateConfig = await getState(code);
    if (stateConfig) {
      return NextResponse.json(stateConfig);
    }

    // State exists but has not been researched yet: return an honest
    // in-research payload with real referral links — never generic rules.
    const entry = stateDirectory.find(s => s.code === code.toUpperCase());
    if (entry) {
      return NextResponse.json({
        comingSoon: true,
        code: entry.code,
        name: entry.name,
        referrals: nationalReferrals,
      });
    }

    return NextResponse.json({ error: 'Unknown state code' }, { status: 404 });
  } catch (error) {
    console.error('API state detail route error:', error);
    return NextResponse.json({ error: 'Failed to fetch state config' }, { status: 500 });
  }
}
