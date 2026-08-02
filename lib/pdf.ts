// Client-side shopping-list PDF (Plus feature). jsPDF is dynamically imported
// so it stays out of the main bundle and never runs on the server.

export interface ShoppingListItem {
  name: string;
  category: string;
  price: number;
}

export interface ShoppingListPdfInput {
  /** "Michigan · Mosher-Jordan", when known. */
  place?: string | null;
  /** "Double · 12 ft x 15 ft", when known. */
  roomLine?: string | null;
  /** Human style name, e.g. "Cozy Aesthetic". */
  styleName?: string | null;
  /** The user's set budget. */
  budget?: number | null;
  items: ShoppingListItem[];
  total: number;
}

type RGB = [number, number, number];
const INK: RGB = [23, 23, 43];
const AMBER: RGB = [240, 177, 0];
const SOFT: RGB = [110, 113, 130];
const LINE: RGB = [220, 225, 236];
// Icon-mark colors (match app/icon.svg and the canvas export watermark).
const COBALT: RGB = [43, 78, 255];
const HIGHLIGHT: RGB = [255, 216, 77];
const MARK_GRAY: RGB = [215, 217, 224];

const money = (n: number) => `$${n.toFixed(2)}`;

/** Build the shopping-list document (shared by the browser download and tests).
 *  jsPDF is imported dynamically so it stays out of the main bundle. */
export async function buildShoppingListDoc(input: ShoppingListPdfInput) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 56;
  const right = pageW - M;
  const catX = 348;
  const nameMaxW = catX - M - 12;
  let y = 66;

  // --- Brand lockup: four-square icon mark + wordmark ---
  const ss = 7; // icon square side
  const gut = 2; // gutter between squares
  const iconX = M;
  const iconY = y - 14;
  const marks: Array<[number, number, RGB]> = [
    [iconX, iconY, COBALT],
    [iconX + ss + gut, iconY, HIGHLIGHT],
    [iconX, iconY + ss + gut, MARK_GRAY],
    [iconX + ss + gut, iconY + ss + gut, INK],
  ];
  for (const [sx, sy, col] of marks) {
    doc.setFillColor(col[0], col[1], col[2]);
    doc.roundedRect(sx, sy, ss, ss, 1.4, 1.4, "F");
  }

  const wordX = M + (ss * 2 + gut) + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text("dorm", wordX, y);
  const dormW = doc.getTextWidth("dorm");
  doc.setTextColor(...AMBER);
  doc.text("scape", wordX + dormW, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SOFT);
  doc.text("SHOPPING LIST", right, y - 12, { align: "right" });
  doc.text("dormscape.us", right, y, { align: "right" });

  // --- Meta ---
  y += 26;
  doc.setFontSize(11);
  const metaLines = [
    input.place || null,
    input.roomLine || null,
    input.styleName ? `Style: ${input.styleName}` : null,
    input.budget != null ? `Budget: ${money(input.budget)}` : null,
  ].filter(Boolean) as string[];
  doc.setTextColor(60, 63, 79);
  for (const lineText of metaLines) {
    doc.text(lineText, M, y);
    y += 16;
  }

  // --- Divider ---
  y += 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(1);
  doc.line(M, y, right, y);
  y += 22;

  function tableHeader() {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...SOFT);
    doc.text("ITEM", M, y);
    doc.text("CATEGORY", catX, y);
    doc.text("PRICE", right, y, { align: "right" });
    y += 8;
    doc.setDrawColor(...LINE);
    doc.line(M, y, right, y);
    y += 16;
  }
  tableHeader();

  // --- Rows ---
  doc.setFontSize(11);
  for (const item of input.items) {
    const nameLines = doc.splitTextToSize(item.name, nameMaxW) as string[];
    const rowH = Math.max(nameLines.length * 14, 16) + 8;

    if (y + rowH > pageH - 72) {
      doc.addPage();
      y = 66;
      tableHeader();
      doc.setFontSize(11);
    }

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(nameLines, M, y);
    doc.setTextColor(...SOFT);
    doc.text(item.category, catX, y);
    doc.setTextColor(...INK);
    doc.text(money(item.price), right, y, { align: "right" });

    y += rowH;
    doc.setDrawColor(244, 246, 251);
    doc.line(M, y - 8, right, y - 8);
  }

  // --- Total ---
  y += 4;
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.2);
  doc.line(M, y, right, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(`Total (${input.items.length} items)`, M, y);
  doc.text(money(input.total), right, y, { align: "right" });

  // --- Footer ---
  const footerY = pageH - 44;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(1);
  doc.line(M, footerY - 14, right, footerY - 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SOFT);
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated ${date} with Dormscape`, M, footerY);
  doc.text(
    "Prices are estimates; some links are affiliate links. Check Amazon for current pricing.",
    M,
    footerY + 12
  );

  return doc;
}

/** Build and download a clean, printable shopping list. */
export async function downloadShoppingListPdf(
  input: ShoppingListPdfInput
): Promise<void> {
  const doc = await buildShoppingListDoc(input);
  doc.save("dormscape-shopping-list.pdf");
}
