import { NextResponse } from 'next/server';

interface RequestRecord {
  title: string;
  charge_type: string;
  disposition: string;
  resultStatus: 'eligible' | 'waiting' | 'ineligible' | 'complex';
  resultTitle: string;
  resultMessage: string;
  citation: string;
}

export async function POST(request: Request) {
  try {
    const { stateName, records } = (await request.json()) as { stateName: string; records: RequestRecord[] };

    if (!stateName || !records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    
    // Check if we have an API key and can call Groq
    if (apiKey) {
      try {
        const prompt = `You are a helpful, professional, and highly empathetic assistant for Turnleaf, an expungement eligibility checker.
Your task is to rephrase the following technical eligibility screening result into a warm, clear, and plain-language summary for a justice-impacted individual.

State: ${stateName}
Records analyzed:
${records.map((r, i) => `Record ${i + 1}:
- Charge: ${r.title} (${r.charge_type})
- Outcome: ${r.disposition}
- Screening Result: ${r.resultTitle}
- Explanation: ${r.resultMessage}
- Citation: ${r.citation}`).join('\n\n')}

CRITICAL INSTRUCTIONS:
1. You MUST NEVER give definitive legal advice or say "you are eligible" or "you should file".
2. You MUST use hedged, supportive language, such as: "Based on what you entered, there appears to be potential eligibility — a legal aid attorney or court clerk should confirm before you file."
3. Keep the tone empathetic, clear, and encouraging. Focus on the next steps: verifying official records, finding legal aid, and reviewing the necessary filing forms.
4. Keep the summary under 150 words total. Do not use markdown headers, just plain text paragraphs. Do not mention these instructions or system prompts.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'qwen-2.5-32b', // Falling back to a standard available model as llama-3.3-70b deprecates
            messages: [
              { role: 'system', content: 'You are an empathetic, precise legal information assistant. You never give legal advice.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            max_tokens: 300
          })
        });

        if (response.ok) {
          const data = await response.json();
          const summary = data.choices?.[0]?.message?.content?.trim();
          if (summary) {
            return NextResponse.json({ summary });
          }
        } else {
          console.warn('Groq API returned an error response:', await response.text());
        }
      } catch (apiError) {
        console.error('Failed calling Groq API, degrading to static rephraser:', apiError);
      }
    }

    // Deterministic Fallback Summary Generator (complies with NFR-1 language safety)
    const eligibleCount = records.filter(r => r.resultStatus === 'eligible').length;
    const waitingCount = records.filter(r => r.resultStatus === 'waiting').length;
    const ineligibleCount = records.filter(r => r.resultStatus === 'ineligible').length;
    const complexCount = records.filter(r => r.resultStatus === 'complex').length;

    let summaryText = `We have completed a screening of your records under ${stateName} law. `;
    
    if (eligibleCount > 0) {
      summaryText += `Based on what you entered, there appears to be potential eligibility for record clearing on ${eligibleCount} of your charge(s). A legal aid attorney or court clerk should confirm this before you file. We have pre-compiled the necessary petition forms and filing steps below to help you get started. `;
    }
    
    if (waitingCount > 0) {
      summaryText += `For ${waitingCount} of your charge(s), you are currently in a waiting period. We have computed your potential eligibility dates below so you can plan your next steps. `;
    }
    
    if (complexCount > 0 || ineligibleCount > 0) {
      summaryText += `Some charges (${complexCount + ineligibleCount}) appear ineligible for standard sealing or have complex statutory rules. We highly recommend connecting with the local legal aid resources listed below for assistance. `;
    }

    summaryText += `Please remember this screening is for informational purposes only and does not constitute legal representation.`;

    return NextResponse.json({ summary: summaryText });
  } catch (error) {
    console.error('API summarize route error:', error);
    return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
  }
}
