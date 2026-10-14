const INVOICE_NO_DIGITS = 6;

// Order.invoiceNo 124 is shown as "INV-000124"
export const formatInvoiceNo = (invoiceNo: number) =>
  `INV-${String(invoiceNo).padStart(INVOICE_NO_DIGITS, "0")}`;
