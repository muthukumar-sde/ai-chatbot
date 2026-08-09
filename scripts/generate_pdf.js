const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const doc = new PDFDocument({ margin: 40, size: "A4" });
const outputPath = path.join(__dirname, "../public/RealEstates.pdf");
const stream = fs.createWriteStream(outputPath);

doc.pipe(stream);

// Primary Palette
const PRIMARY = "#0284c7";
const DARK_TEXT = "#0f172a";
const SECONDARY = "#475569";
const LIGHT_BG = "#f0f9ff";

// Title Header
doc
  .rect(0, 0, 595.28, 90)
  .fill(PRIMARY);

doc
  .fillColor("#ffffff")
  .fontSize(22)
  .font("Helvetica-Bold")
  .text("MK PROPERTIES — REAL ESTATE ASSISTANT & KNOWLEDGE BASE", 40, 28, { width: 515, align: "center" });

doc
  .fontSize(11)
  .font("Helvetica")
  .text("Verified Guidelines, Home Loan Rates, Legal Processes & Booking Terms in Tamil Nadu", 40, 58, { width: 515, align: "center" });

doc.moveDown(3);

// Helper Section Function
function addSectionHeader(title) {
  doc
    .moveDown(0.8)
    .fillColor(PRIMARY)
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(title)
    .moveDown(0.3);

  doc
    .strokeColor("#cbd5e1")
    .lineWidth(1)
    .moveTo(40, doc.y)
    .lineTo(555, doc.y)
    .stroke()
    .moveDown(0.5);
}

function addBodyText(text) {
  doc
    .fillColor(DARK_TEXT)
    .fontSize(9.5)
    .font("Helvetica")
    .text(text, { align: "justify", lineGap: 3 })
    .moveDown(0.4);
}

// 1. Company Overview
addSectionHeader("1. ABOUT MK PROPERTIES CONSULTANCY");
addBodyText(
  "MK Properties is Tamil Nadu's leading real estate advisory and property management consultancy, established in 2012. Registered under RERA Tamil Nadu (TN/RERA/AGENT/00142/2018) and accredited by DTCP/CMDA panels, MK Properties manages over 2,500+ verified residential apartments, independent houses, luxury villas, commercial spaces, and DTCP approved plots across major cities in Tamil Nadu including Chennai, Coimbatore, Madurai, Trichy, Salem, and Vellore."
);

addBodyText(
  "Headquarters: MK Tower, 4th Floor, OMR IT Corridor, Perungudi, Chennai - 600096.\n" +
  "Coimbatore Office: 124 RS Puram Main Road, Coimbatore - 641002.\n" +
  "Madurai Office: 45 KK Nagar 80 Feet Road, Madurai - 625020.\n" +
  "Trichy Office: 18 Cantonment Road, Trichy - 620001.\n" +
  "Customer Helpline: +91 98765 43210 | Official Email: support@mkproperties.in"
);

// 2. Services Offered
addSectionHeader("2. CORE SERVICES OFFERED");
addBodyText(
  "• Property Buying & Selling: End-to-end guidance for residential apartments, houses, villas, and commercial spaces.\n" +
  "• Rental & Lease Management: Tenant background screening, rental agreement drafting, and property maintenance.\n" +
  "• Free Doorstep Site Visit: Free pickup & drop for verified buyers and prospective tenants.\n" +
  "• Legal Due Diligence: 30-year parent deed verification and Encumbrance Certificate (EC) audit by High Court advocates.\n" +
  "• Home Loan Assistance: Instant loan sanction support with top nationalized and private banks."
);

// 3. Home Loan Guidelines
addSectionHeader("3. HOME LOAN GUIDELINES & INTEREST RATES (UPDATED 2026)");
addBodyText(
  "MK Properties has direct tie-ups with State Bank of India (SBI), HDFC Bank, ICICI Bank, Axis Bank, Bank of Baroda, and Canara Bank.\n\n" +
  "• Floating Interest Rates: 8.35% to 8.75% per annum for CIBIL credit scores of 750 and above.\n" +
  "• Maximum Loan Eligibility (LTV Ratio):\n" +
  "   - Property Value up to Rs. 30 Lakhs: Up to 90% loan sanction.\n" +
  "   - Property Value Rs. 30 Lakhs to Rs. 75 Lakhs: Up to 80% loan sanction.\n" +
  "   - Property Value above Rs. 75 Lakhs: Up to 75% loan sanction.\n" +
  "• Maximum Repayment Tenure: Up to 30 years (360 months).\n\n" +
  "Salaried Applicants Required Documents: Aadhaar Card, PAN Card, 3 Months Payslips, 6 Months Bank Statements, 2 Years Form 16.\n" +
  "Self-Employed Applicants Required Documents: Business Registration / GST Certificate, 3 Years ITR with Computation, Audited P&L Account & Balance Sheet, 12 Months Bank Statements."
);

// 4. Legal Due Diligence & Registration Fees
addSectionHeader("4. LEGAL DUE DILIGENCE & REGISTRATION CHARGES IN TAMIL NADU");
addBodyText(
  "Every listing on MK Properties undergoes a 5-tier legal verification before publishing:\n" +
  "1. Parent Title Deed Verification (Minimum 30-year legal clearance).\n" +
  "2. Encumbrance Certificate (EC): Form 15 (Encumbered) & Form 16 (Nil Encumbrance) verification.\n" +
  "3. Layout Approvals: CMDA (Chennai Metropolitan Development Authority) or DTCP (Directorate of Town & Country Planning) approval number.\n" +
  "4. Patta / Chitta / TSLR (Town Survey Land Record) in seller's name.\n" +
  "5. RERA Registration Status on TN RERA portal.\n\n" +
  "Government Registration Charges in Tamil Nadu:\n" +
  "• Stamp Duty: 7% of property market value or government guidance value (whichever is higher).\n" +
  "• Registration Fee: 2% of property market value.\n" +
  "• Total Government Transfer Charges: 9%."
);

// 5. Site Visits & Booking Token Policy
addSectionHeader("5. SITE VISITS & REFUNDABLE TOKEN BOOKING POLICY");
addBodyText(
  "• Site Visit Scheduling: Free doorstep pickup & drop available Monday to Sunday from 9:00 AM to 6:00 PM IST.\n" +
  "• Booking Advance / Token:\n" +
  "   - For Buy Properties: Token advance of Rs. 50,000 to reserve the property for 14 days.\n" +
  "   - For Rent Properties: Token advance equal to 1 month rent to hold listing for 7 days.\n" +
  "• 100% Refund Guarantee: All booking tokens are 100% fully refundable within 7 business days if any legal flaw or unresolvable encumbrance is found during legal due diligence."
);

// 6. NRI Real Estate Desk
addSectionHeader("6. NRI REAL ESTATE DESK & OVERSEAS INVESTOR SUPPORT");
addBodyText(
  "MK Properties provides specialized NRI real estate desk support for non-resident Indians:\n" +
  "• NRE / NRO bank account transactions in full compliance with RBI FEMA guidelines.\n" +
  "• Power of Attorney (POA) registration and attestation support via Indian Embassies / Consulates for overseas buyers unable to attend physical registration in Tamil Nadu."
);

// Footer
doc
  .moveDown(1.5)
  .fontSize(8)
  .font("Helvetica-Oblique")
  .fillColor(SECONDARY)
  .text("Confidential & Proprietary Document — MK Properties Real Estate Consultancy © 2026. All Rights Reserved.", { align: "center" });

doc.end();

stream.on("finish", () => {
  console.log("✅ PDF successfully generated at:", outputPath);
});
