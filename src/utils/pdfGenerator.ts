import { jsPDF } from 'jspdf';

interface PDFRecord {
  title: string;
  charge_type: string;
  disposition: string;
  resultStatus: 'eligible' | 'waiting' | 'ineligible' | 'complex';
  resultTitle: string;
  resultMessage: string;
  citation: string;
}

interface PDFStateInfo {
  name: string;
  lastReviewed: string;
  verificationStatus: string;
  legalAid: Array<{ name: string; url: string }>;
  remedies: Record<string, {
    name: string;
    formName: string | null;
    formUrl: string | null;
    steps: string[];
    fees: string | null;
    feeWaiver: string | null;
    courtContact: string | null;
  }>;
}

/**
 * What a null resource field says out loud.
 *
 * This one matters more in the PDF than on screen: people take this document
 * to a courthouse. `${null}` renders as the literal string "null", which would
 * read as an answer. It is not an answer.
 */
const NOT_VERIFIED = 'Not yet verified — ask the court clerk';

export function generateReportPDF(
  candidateName: string,
  stateInfo: PDFStateInfo,
  records: PDFRecord[],
  aiSummary?: string
) {
  const doc = new jsPDF();
  let y = 20;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const width = doc.internal.pageSize.width - 2 * margin;

  const addTextWithWrapping = (
    text: string,
    x: number,
    currentY: number,
    size: number,
    style: 'normal' | 'bold' = 'normal',
    color: [number, number, number] = [30, 34, 31]
  ): number => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    
    const lines = doc.splitTextToSize(text, width - (x - margin));
    
    // Check page overflow for this block of text
    const blockHeight = lines.length * (size * 0.4) + 4;
    if (currentY + blockHeight > pageHeight - margin) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.text(lines, x, currentY);
    return currentY + blockHeight;
  };

  // Draw Header Accent Bar
  doc.setFillColor(77, 124, 89); // Sage Green
  doc.rect(0, 0, doc.internal.pageSize.width, 8, 'F');
  
  y = addTextWithWrapping('Turnleaf Expungement Screening Report', margin, y, 20, 'bold', [77, 124, 89]);
  y = addTextWithWrapping(`Prepared for: ${candidateName || 'Anonymous Candidate'}`, margin, y, 10, 'normal', [90, 98, 92]);
  y = addTextWithWrapping(`State Checked: ${stateInfo.name} (Data Last Reviewed: ${stateInfo.lastReviewed} | Status: ${stateInfo.verificationStatus})`, margin, y, 10, 'normal', [90, 98, 92]);
  
  y += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(220, 224, 220);
  doc.line(margin, y, margin + width, y);
  y += 6;

  // Disclaimer Block (NFR-1/R1 Safety Requirement)
  y = addTextWithWrapping('LEGAL INFORMATION SCREENING DISCLAIMER:', margin, y, 9, 'bold', [192, 57, 43]);
  const disclaimerText = 'This report contains general legal information, not legal advice or a definitive eligibility determination. Based on what you entered, there appears to be potential eligibility for the remedies listed — a legal aid attorney or court clerk should confirm details before you file. Under no circumstances does this report constitute legal representation or filing instructions.';
  y = addTextWithWrapping(disclaimerText, margin, y, 8.5, 'normal', [192, 57, 43]);
  
  y += 2;
  doc.line(margin, y, margin + width, y);
  y += 6;

  // AI/Plain-Language Summary
  if (aiSummary) {
    y = addTextWithWrapping('Plain-Language Summary:', margin, y, 12, 'bold', [77, 124, 89]);
    y = addTextWithWrapping(aiSummary, margin, y, 9.5, 'normal', [30, 34, 31]);
    y += 4;
  }

  // Conviction details
  y = addTextWithWrapping('Conviction Screening Detail:', margin, y, 13, 'bold', [77, 124, 89]);
  y += 2;

  records.forEach((record, index) => {
    y = addTextWithWrapping(`${index + 1}. ${record.title} (${record.charge_type.toUpperCase()}) — Outcome: ${record.disposition.toUpperCase()}`, margin, y, 11, 'bold');
    
    let statusColor: [number, number, number] = [90, 98, 92];
    if (record.resultStatus === 'eligible') statusColor = [30, 130, 76]; // Emerald
    else if (record.resultStatus === 'waiting') statusColor = [217, 119, 6]; // Amber
    else if (record.resultStatus === 'ineligible') statusColor = [192, 57, 43]; // Terracotta
    else if (record.resultStatus === 'complex') statusColor = [45, 72, 52]; // Dark green

    y = addTextWithWrapping(`Screening Result: ${record.resultTitle}`, margin + 5, y, 9.5, 'bold', statusColor);
    y = addTextWithWrapping(`Rule Applied: ${record.resultMessage}`, margin + 5, y, 9.5, 'normal');
    y = addTextWithWrapping(`Statute Citation: ${record.citation}`, margin + 5, y, 9, 'normal', [90, 98, 92]);
    y += 3;
  });

  // Next Steps / Filing Instructions
  const hasEligible = records.some(r => r.resultStatus === 'eligible');
  if (hasEligible && Object.keys(stateInfo.remedies).length > 0) {
    y = addTextWithWrapping('State Filing Actions & Forms:', margin, y, 13, 'bold', [77, 124, 89]);
    y += 2;

    Object.entries(stateInfo.remedies).forEach(([_, remedy]) => {
      y = addTextWithWrapping(`Remedy: ${remedy.name}`, margin, y, 11, 'bold');
      y = addTextWithWrapping(`Required Form: ${remedy.formName ?? NOT_VERIFIED}`, margin + 5, y, 9.5, 'normal');
      // The link line is omitted entirely when unverified — printing
      // "Download Link: null" in a document someone carries to a courthouse is
      // worse than printing no line at all.
      if (remedy.formUrl) {
        y = addTextWithWrapping(`Download Link: ${remedy.formUrl}`, margin + 5, y, 8.5, 'normal', [77, 124, 89]);
      }
      y = addTextWithWrapping(`Court Fees: ${remedy.fees ?? NOT_VERIFIED}`, margin + 5, y, 9.5, 'normal');
      y = addTextWithWrapping(`Fee Waiver Availability: ${remedy.feeWaiver ?? NOT_VERIFIED}`, margin + 5, y, 9.5, 'normal');
      y = addTextWithWrapping(`Where to File: ${remedy.courtContact ?? NOT_VERIFIED}`, margin + 5, y, 9.5, 'normal');
      
      y = addTextWithWrapping('Filing Steps:', margin + 5, y, 9.5, 'bold');
      remedy.steps.forEach((step, idx) => {
        y = addTextWithWrapping(`[ ] Step ${idx + 1}: ${step}`, margin + 8, y, 9, 'normal');
      });
      y += 3;
    });
  }

  // Legal Aid Directory Resources
  y = addTextWithWrapping('Local Legal Assistance Resources:', margin, y, 13, 'bold', [77, 124, 89]);
  y += 2;
  stateInfo.legalAid.forEach(aid => {
    y = addTextWithWrapping(`- ${aid.name}: ${aid.url}`, margin + 5, y, 9.5, 'normal');
  });

  // Stamp headers and footers onto all pages
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
    doc.text('Turnleaf — 50 States of Record Sealing Law. One Plain Answer.', margin, doc.internal.pageSize.height - 10);
  }

  doc.save('Turnleaf_Eligibility_Report.pdf');
}
