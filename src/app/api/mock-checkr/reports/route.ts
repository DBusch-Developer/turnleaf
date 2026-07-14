import { NextResponse } from 'next/server';

export interface CheckrRecord {
  id: string;
  title: string;
  charge_type: 'misdemeanor' | 'felony' | 'infraction';
  charge_class?: string;
  disposition: 'convicted' | 'dismissed' | 'deferred' | 'acquitted';
  disposition_date: string;
  state: string;
  // Metadata fields for state-specific rule checks
  probation_status?: 'completed' | 'failed' | 'active' | 'none';
  prison_sentenced?: boolean;
  restitution_paid?: boolean;
}

export interface CheckrReport {
  id: string;
  status: 'clear' | 'consider';
  completed_at: string;
  candidate: {
    first_name: string;
    last_name: string;
    dob: string;
  };
  records: CheckrRecord[];
}

export const mockCheckrPersonas: Record<string, { name: string; description: string; report: CheckrReport }> = {
  marcus_ca: {
    name: 'Marcus (CA Misdemeanor)',
    description: 'California Petty Theft misdemeanor. Probation completed, eligible for expungement.',
    report: {
      id: 'rep_001',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Marcus', last_name: 'Miller', dob: '1995-04-12' },
      records: [
        {
          id: 'rec_ca_01',
          title: 'Petty Theft (PC 484)',
          charge_type: 'misdemeanor',
          disposition: 'convicted',
          disposition_date: '2024-03-10',
          state: 'CA',
          probation_status: 'completed',
          prison_sentenced: false
        }
      ]
    }
  },
  sarah_tx: {
    name: 'Sarah (TX Felony Conviction)',
    description: 'Texas Felony conviction (Burglary). Ineligible for expungement under Texas law.',
    report: {
      id: 'rep_002',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Sarah', last_name: 'Jenkins', dob: '1991-08-22' },
      records: [
        {
          id: 'rec_tx_01',
          title: 'Burglary of a Habitation (PC 30.02)',
          charge_type: 'felony',
          disposition: 'convicted',
          disposition_date: '2021-05-15',
          state: 'TX',
          probation_status: 'completed',
          prison_sentenced: false
        }
      ]
    }
  },
  david_az: {
    name: 'David (AZ Misdemeanor Set-Aside)',
    description: 'Arizona Drug Paraphernalia misdemeanor. Restitution paid, eligible for set-aside.',
    report: {
      id: 'rep_003',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'David', last_name: 'Carter', dob: '1988-11-30' },
      records: [
        {
          id: 'rec_az_01',
          title: 'Possession of Drug Paraphernalia (ARS 13-3415)',
          charge_type: 'misdemeanor',
          disposition: 'convicted',
          disposition_date: '2025-01-20',
          state: 'AZ',
          probation_status: 'completed',
          restitution_paid: true
        }
      ]
    }
  },
  jessica_ca_prison: {
    name: 'Jessica (CA Felony with Prison)',
    description: 'California Assault with state prison sentence. Complex path (realignment / certificate needed).',
    report: {
      id: 'rep_004',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Jessica', last_name: 'Taylor', dob: '1993-01-15' },
      records: [
        {
          id: 'rec_ca_02',
          title: 'Assault with a Deadly Weapon (PC 245)',
          charge_type: 'felony',
          disposition: 'convicted',
          disposition_date: '2020-04-10',
          state: 'CA',
          probation_status: 'none',
          prison_sentenced: true
        }
      ]
    }
  },
  carlos_ny_waiting: {
    name: 'Carlos (NY Driving Offense - Waiting)',
    description: 'New York Misdemeanor (DWAI) from 2023. Waiting period of 10 years not yet elapsed.',
    report: {
      id: 'rep_005',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Carlos', last_name: 'Ramirez', dob: '1997-09-05' },
      records: [
        {
          id: 'rec_ny_01',
          title: 'Driving While Ability Impaired (VTL 1192)',
          charge_type: 'misdemeanor',
          disposition: 'convicted',
          disposition_date: '2023-11-05',
          state: 'NY',
          probation_status: 'completed'
        }
      ]
    }
  },
  aisha_ca_mixed: {
    name: 'Aisha (CA Mixed - Dismissed + Convicted)',
    description: 'California multi-conviction. Dismissed trespassing (sealable) & convicted vandalism (expungeable).',
    report: {
      id: 'rep_006',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Aisha', last_name: 'Davis', dob: '1990-06-18' },
      records: [
        {
          id: 'rec_ca_03',
          title: 'Criminal Trespass (PC 602)',
          charge_type: 'misdemeanor',
          disposition: 'dismissed',
          disposition_date: '2025-02-15',
          state: 'CA'
        },
        {
          id: 'rec_ca_04',
          title: 'Vandalism (PC 594)',
          charge_type: 'misdemeanor',
          disposition: 'convicted',
          disposition_date: '2024-08-10',
          state: 'CA',
          probation_status: 'completed',
          prison_sentenced: false
        }
      ]
    }
  },
  linda_az_waiting: {
    name: 'Linda (AZ Felony - Waiting)',
    description: 'Arizona Credit Card Theft felony. absolute discharge in late 2025; 2-year wait unmet.',
    report: {
      id: 'rep_007',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Linda', last_name: 'O\'Connor', dob: '1987-10-10' },
      records: [
        {
          id: 'rec_az_02',
          title: 'Theft of Credit Card (ARS 13-2102)',
          charge_type: 'felony',
          disposition: 'convicted',
          disposition_date: '2025-10-01',
          state: 'AZ',
          probation_status: 'completed',
          restitution_paid: true
        }
      ]
    }
  },
  thomas_multistate: {
    name: 'Thomas (Multi-State CA & TX)',
    description: 'Dismissed possession in CA (eligible), convicted misdemeanor theft in TX (ineligible).',
    report: {
      id: 'rep_008',
      status: 'consider',
      completed_at: '2026-07-01T12:00:00Z',
      candidate: { first_name: 'Thomas', last_name: 'Smith', dob: '1992-12-04' },
      records: [
        {
          id: 'rec_ca_05',
          title: 'Possession of Cannabis (HS 11357)',
          charge_type: 'misdemeanor',
          disposition: 'dismissed',
          disposition_date: '2022-09-14',
          state: 'CA'
        },
        {
          id: 'rec_tx_02',
          title: 'Theft < $2,500 (PC 31.03)',
          charge_type: 'misdemeanor',
          disposition: 'convicted',
          disposition_date: '2023-01-18',
          state: 'TX',
          probation_status: 'completed'
        }
      ]
    }
  }
};

export async function GET() {
  // Returns listing of available test personas
  const list = Object.entries(mockCheckrPersonas).map(([id, p]) => ({
    id,
    name: p.name,
    description: p.description
  }));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const { personaId } = await request.json();
    const persona = mockCheckrPersonas[personaId];
    if (!persona) {
      return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
    }
    return NextResponse.json(persona.report);
  } catch (error) {
    console.error('API mock Checkr error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
