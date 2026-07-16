import { NextResponse } from 'next/server';
import { getState, isScreenable } from '@/db/client';
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

    // Rules exist AND a person has verified them: screen against them.
    if (stateConfig && isScreenable(stateConfig.verificationStatus)) {
      return NextResponse.json(stateConfig);
    }

    // Everything else routes to the in-research panel with real referrals —
    // never generic rules. Two different situations land here and they are NOT
    // the same claim, so `reason` tells them apart:
    //
    //   'draft'         — the research exists and is cited, but nobody has
    //                     confirmed it with a court yet. Saying "we're still
    //                     researching this" would be false.
    //   'not_researched'— no rules at all.
    //
    // Draft states carry their open-question count: it is the honest answer to
    // "why not?" and it is what a verification call closes.
    const entry = stateDirectory.find(s => s.code === code.toUpperCase());
    if (entry) {
      return NextResponse.json({
        comingSoon: true,
        reason: stateConfig ? 'draft' : 'not_researched',
        code: entry.code,
        name: entry.name,
        openQuestionCount: stateConfig?.openQuestions.length ?? 0,
        referrals: nationalReferrals,
      });
    }

    return NextResponse.json({ error: 'Unknown state code' }, { status: 404 });
  } catch (error) {
    console.error('API state detail route error:', error);
    return NextResponse.json({ error: 'Failed to fetch state config' }, { status: 500 });
  }
}
