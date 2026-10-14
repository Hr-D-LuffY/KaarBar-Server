import PDFDocument from "pdfkit";

const TIME_ZONE = "Asia/Dhaka";
const PAGE_MARGIN = 40;
const PAGE_BOTTOM_RESERVE = 70;
const TOTALS_BLOCK_HEIGHT = 130;
const ROW_PADDING = 6;

const FONT = "Helvetica";
const FONT_BOLD = "Helvetica-Bold";
const TEXT_COLOR = "#1f2933";
const MUTED_COLOR = "#6b7280";
const LINE_COLOR = "#d1d5db";
const CANCELLED_COLOR = "#dc2626";
const CANCELLED_OPACITY = 0.16;
const CANCELLED_ANGLE = -35;
const CANCELLED_FONT_SIZE = 96;

const THOUSANDS_SEPARATOR = /\B(?=(\d{3})+(?!\d))/g;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

export type InvoiceLine = {
  name: string;
  quantity: string;
  rate: string;
  amount: string;
};

export type InvoiceData = {
  shop: { name: string; phone: string; address: string };
  invoiceNumber: string;
  issuedAt: Date;
  customer: { name: string; phone: string } | null;
  lines: InvoiceLine[];
  subtotal: string;
  discount: string;
  total: string;
  paid: string;
  remaining: string;
  isCancelled: boolean;
  cancelReason: string | null;
};

type Column = { x: number; width: number; align: "left" | "right" };

// Money arrives as plain decimal strings ("1250.50"); only the integer part gets separators
const groupThousands = (amount: string) => {
  const [whole = "", fraction] = amount.split(".");
  const grouped = whole.replace(THOUSANDS_SEPARATOR, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
};

const hasAmount = (amount: string) => /[1-9]/.test(amount);

export const buildInvoicePdf = (data: InvoiceData): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: PAGE_MARGIN,
      info: { Title: data.invoiceNumber, Author: data.shop.name },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - PAGE_MARGIN * 2;
    const right = PAGE_MARGIN + contentWidth;
    const columns: Record<"no" | "item" | "qty" | "rate" | "amount", Column> = {
      no: { x: PAGE_MARGIN, width: 28, align: "left" },
      item: { x: PAGE_MARGIN + 28, width: contentWidth - 28 - 270, align: "left" },
      qty: { x: right - 270, width: 90, align: "right" },
      rate: { x: right - 180, width: 85, align: "right" },
      amount: { x: right - 95, width: 95, align: "right" },
    };

    const text = (value: string, x: number, y: number, width: number, align: "left" | "right") =>
      doc.text(value, x, y, { width, align });

    const drawWatermark = () => {
      if (!data.isCancelled) return;
      const centerX = doc.page.width / 2;
      const centerY = doc.page.height / 2;
      doc.save();
      doc.rotate(CANCELLED_ANGLE, { origin: [centerX, centerY] });
      doc.fillColor(CANCELLED_COLOR).fillOpacity(CANCELLED_OPACITY);
      doc.font(FONT_BOLD).fontSize(CANCELLED_FONT_SIZE);
      doc.text("CANCELLED", 0, centerY - CANCELLED_FONT_SIZE / 2, {
        width: doc.page.width,
        align: "center",
        lineBreak: false,
      });
      doc.restore();
    };

    doc.on("pageAdded", drawWatermark);
    drawWatermark();

    // Header: shop on the left, invoice details on the right
    doc.fillColor(TEXT_COLOR).font(FONT_BOLD).fontSize(20);
    text(data.shop.name, PAGE_MARGIN, PAGE_MARGIN, contentWidth * 0.6, "left");
    doc.font(FONT).fontSize(10).fillColor(MUTED_COLOR);
    const shopBlockY = doc.y + 2;
    text(data.shop.address, PAGE_MARGIN, shopBlockY, contentWidth * 0.6, "left");
    text(data.shop.phone, PAGE_MARGIN, doc.y + 2, contentWidth * 0.6, "left");
    const headerBottomLeft = doc.y;

    const infoX = PAGE_MARGIN + contentWidth * 0.6;
    const infoWidth = contentWidth * 0.4;
    doc.fillColor(TEXT_COLOR).font(FONT_BOLD).fontSize(20);
    text("INVOICE", infoX, PAGE_MARGIN, infoWidth, "right");
    doc.font(FONT_BOLD).fontSize(11);
    text(data.invoiceNumber, infoX, doc.y + 2, infoWidth, "right");
    doc.font(FONT).fontSize(10).fillColor(MUTED_COLOR);
    text(dateFormat.format(data.issuedAt), infoX, doc.y + 2, infoWidth, "right");
    if (data.isCancelled) {
      doc.font(FONT_BOLD).fillColor(CANCELLED_COLOR);
      text("CANCELLED", infoX, doc.y + 2, infoWidth, "right");
    }

    // Customer
    let y = Math.max(headerBottomLeft, doc.y) + 24;
    doc.font(FONT).fontSize(9).fillColor(MUTED_COLOR);
    text("BILL TO", PAGE_MARGIN, y, contentWidth, "left");
    doc.font(FONT_BOLD).fontSize(12).fillColor(TEXT_COLOR);
    text(data.customer?.name ?? "Walk-in customer", PAGE_MARGIN, doc.y + 2, contentWidth, "left");
    if (data.customer) {
      doc.font(FONT).fontSize(10).fillColor(MUTED_COLOR);
      text(data.customer.phone, PAGE_MARGIN, doc.y + 2, contentWidth, "left");
    }
    y = doc.y + 20;

    const drawTableHeader = (top: number) => {
      doc.font(FONT_BOLD).fontSize(9).fillColor(MUTED_COLOR);
      const labels: [string, Column][] = [
        ["#", columns.no],
        ["ITEM", columns.item],
        ["QTY", columns.qty],
        ["RATE", columns.rate],
        ["AMOUNT (Tk)", columns.amount],
      ];
      for (const [label, column] of labels) text(label, column.x, top, column.width, column.align);
      const lineY = top + 16;
      doc
        .moveTo(PAGE_MARGIN, lineY)
        .lineTo(right, lineY)
        .strokeColor(TEXT_COLOR)
        .lineWidth(1)
        .stroke();
      return lineY + ROW_PADDING;
    };

    const bottomLimit = () => doc.page.height - PAGE_BOTTOM_RESERVE;

    y = drawTableHeader(y);

    data.lines.forEach((line, index) => {
      doc.font(FONT).fontSize(10);
      const itemHeight = doc.heightOfString(line.name, { width: columns.item.width });
      const rowHeight = itemHeight + ROW_PADDING * 2;

      if (y + rowHeight > bottomLimit()) {
        doc.addPage();
        y = drawTableHeader(PAGE_MARGIN);
      }

      doc.font(FONT).fontSize(10).fillColor(TEXT_COLOR);
      text(String(index + 1), columns.no.x, y, columns.no.width, "left");
      text(line.name, columns.item.x, y, columns.item.width, "left");
      text(line.quantity, columns.qty.x, y, columns.qty.width, "right");
      text(groupThousands(line.rate), columns.rate.x, y, columns.rate.width, "right");
      text(groupThousands(line.amount), columns.amount.x, y, columns.amount.width, "right");

      const lineY = y + itemHeight + ROW_PADDING;
      doc
        .moveTo(PAGE_MARGIN, lineY)
        .lineTo(right, lineY)
        .strokeColor(LINE_COLOR)
        .lineWidth(0.5)
        .stroke();
      y = lineY + ROW_PADDING;
    });

    // Totals
    if (y + TOTALS_BLOCK_HEIGHT > bottomLimit()) {
      doc.addPage();
      y = PAGE_MARGIN;
    }
    y += 6;

    const labelX = right - 230;
    const labelWidth = 130;
    const drawTotal = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? FONT_BOLD : FONT)
        .fontSize(bold ? 12 : 10)
        .fillColor(TEXT_COLOR);
      text(label, labelX, y, labelWidth, "left");
      text(groupThousands(value), right - 100, y, 100, "right");
      y += bold ? 22 : 18;
    };

    drawTotal("Subtotal", data.subtotal);
    if (hasAmount(data.discount)) drawTotal("Discount", `-${data.discount}`);
    drawTotal("Total", data.total, true);
    drawTotal("Paid", data.paid);
    drawTotal("Remaining", data.remaining, true);

    if (data.isCancelled && data.cancelReason) {
      y += 8;
      doc.font(FONT_BOLD).fontSize(10).fillColor(CANCELLED_COLOR);
      text("Cancelled", PAGE_MARGIN, y, contentWidth, "left");
      doc.font(FONT).fillColor(TEXT_COLOR);
      text(`Reason: ${data.cancelReason}`, PAGE_MARGIN, doc.y + 2, contentWidth, "left");
    }

    doc.end();
  });
