import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import signatureImg from "@/assets/signature.png";

const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  // TOP SECTION
  topSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  logoBox: {
    backgroundColor: "#1E293B",
    padding: 12,
    width: "45%",
    justifyContent: "center",
  },
  logoText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Helvetica-Bold",
  },
  docTitleBox: {
    width: "45%",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 22,
    color: "#EA6A38", // Brand Orange
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    marginBottom: 5,
    textTransform: "uppercase"
  },
  metaGrid: {
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-end"
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 2,
  },
  metaLabel: {
    fontSize: 9,
    color: "#475569",
    width: 80,
    textAlign: "right",
    marginRight: 10,
  },
  metaValue: {
    fontSize: 9,
    color: "#1E293B",
    fontFamily: "Helvetica-Bold",
    width: 100,
  },
  // COMPANY & CUSTOMER INFO
  addressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  addressBox: {
    width: "48%",
  },
  addressHeader: {
    backgroundColor: "#1E293B", // Navy Blue
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  addressHeaderText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  addressTextLine: {
    fontSize: 8,
    color: "#1E293B",
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  addressTextBold: {
    fontSize: 8,
    color: "#1E293B",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  // TABLE
  table: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    fontSize: 9,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableCell: {
    fontSize: 9,
    color: "#1E293B",
  },
  tableCellBold: {
    fontSize: 9,
    color: "#1E293B",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  // TOTALS
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 15,
  },
  totalsBox: {
    width: "40%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  totalLabel: {
    fontSize: 9,
    color: "#475569",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  totalValue: {
    fontSize: 9,
    color: "#1E293B",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#EA6A38", // Orange for Grand Total highlight
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  grandTotalLabel: {
    fontSize: 10,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  grandTotalValue: {
    fontSize: 10,
    color: "#FFFFFF",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  // BANK INFO
  bankInfoContainer: {
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#94A3B8",
  },
  bankInfoHeader: {
    backgroundColor: "#E2E8F0",
    paddingVertical: 4,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#94A3B8",
  },
  bankInfoHeaderText: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#1E293B",
  },
  bankInfoBody: {
    padding: 8,
    backgroundColor: "#F8FAFC",
  },
  bankInfoRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bankInfoLabel: {
    width: "35%",
    fontSize: 8,
    color: "#475569",
    textTransform: "uppercase",
  },
  bankInfoValueLineNormal: {
    width: "65%",
    fontSize: 8,
    color: "#1E293B",
  },
  bankInfoValueLine: {
    width: "65%",
    fontSize: 8,
    color: "#1E293B",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  // SIGNATURES
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  sigBox: {
    width: "40%",
  },
  sigTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    marginBottom: 10,
    color: "#1E293B",
  },
  sigLine: {
    fontSize: 8,
    color: "#475569",
    marginBottom: 4,
  },
  sigLineBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
    width: "100%",
    height: 10,
    marginBottom: 4,
  },
  footerText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 7,
    color: "#64748B",
    fontStyle: "italic",
  }
});

interface Props {
  invoice: any;
  customerOverride?: {
    name: string;
    address: string;
    phone: string;
  };
}

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const InvoicePDF = ({ invoice, customerOverride }: Props) => {
  return (
    <Document title={`Invoice_${invoice?.invoice_number || 'Draft'}`}>
      <Page size="A4" style={styles.page}>
        
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>OZMAE FREIGHT SOLUTIONS</Text>
            <Text style={{ color: "#94A3B8", fontSize: 8, marginTop: 4 }}>Logistics & Supply Chain</Text>
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>INVOICE</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice Date:</Text>
                <Text style={styles.metaValue}>{invoice?.created_at ? format(new Date(invoice.created_at), "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy")}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Invoice #:</Text>
                <Text style={styles.metaValue}>{invoice?.invoice_number || 'DRAFT'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Job Reference:</Text>
                <Text style={styles.metaValue}>{invoice?.job_order_id ? `JOB-${invoice.job_order_id.split('-')[0].toUpperCase()}` : 'N/A'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Payment Terms:</Text>
                <Text style={styles.metaValue}>Due on Receipt</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ADDRESSES */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressHeaderText}>Invoice From</Text>
            </View>
            <Text style={styles.addressTextBold}>OZMAE FREIGHT SOLUTIONS</Text>
            <Text style={styles.addressTextLine}>P.O. Box 2699, Rita Tower Sim Road</Text>
            <Text style={styles.addressTextLine}>Dar es Salaam, Tanzania</Text>
            <Text style={styles.addressTextLine}>Mob: +255754757670</Text>
          </View>
          
          <View style={styles.addressBox}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressHeaderText}>Invoice To / Customer</Text>
            </View>
            <Text style={styles.addressTextBold}>{customerOverride?.name || invoice?.job?.customer?.company_name || 'Valued Customer'}</Text>
            <Text style={styles.addressTextLine}>{customerOverride?.address || 'Registered Logistics Partner'}</Text>
            <Text style={styles.addressTextLine}>{customerOverride?.phone || `Route: ${invoice?.job?.origin || 'N/A'} to ${invoice?.job?.destination || 'N/A'}`}</Text>
          </View>
        </View>

        {/* TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Item #</Text>
            <Text style={[styles.tableHeaderCell, { width: "50%" }]}>Description / Route</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: "25%", textAlign: "right" }]}>Total (USD)</Text>
          </View>
          
          <View style={styles.tableRow}>
            <Text style={[styles.tableCellBold, { width: "10%" }]}>1</Text>
            <View style={{ width: "50%" }}>
              <Text style={styles.tableCellBold}>Transport & Logistics Services</Text>
              <Text style={[styles.tableCell, { marginTop: 4, color: "#475569" }]}>Origin: {invoice?.job?.origin || 'N/A'}</Text>
              <Text style={[styles.tableCell, { marginTop: 2, color: "#475569" }]}>Destination: {invoice?.job?.destination || 'N/A'}</Text>
            </View>
            <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>1</Text>
            <Text style={[styles.tableCellBold, { width: "25%", textAlign: "right" }]}>{formatCurrency(invoice?.total_amount_usd || 0)}</Text>
          </View>
        </View>

        {/* TOTALS */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice?.subtotal_usd || invoice?.total_amount_usd || 0)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (0%)</Text>
              <Text style={styles.totalValue}>$0.00</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice?.total_amount_usd || 0)}</Text>
            </View>
          </View>
        </View>

        {/* BANK DETAILS COMPACT GRID */}
        <View style={styles.bankInfoContainer}>
          <View style={styles.bankInfoHeader}>
            <Text style={styles.bankInfoHeaderText}>FUND TRANSFER INFORMATION</Text>
          </View>
          <View style={styles.bankInfoBody}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              {/* Left Column */}
              <View style={{ width: "48%" }}>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>FOR FINAL CREDIT TO:</Text>
                  <Text style={styles.bankInfoValueLineNormal}>KCB BANK TANZANIA LIMITED{"\n"}ALI HASSAN MWINYI/KAUNDA DRIVE JUNCTION{"\n"}P.O.BOX 804{"\n"}DAR ES SALAAM, TANZANIA.{"\n"}SWIFT: KCBLTZTZ</Text>
                </View>
              </View>

              {/* Right Column */}
              <View style={{ width: "48%" }}>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>BENEFICIARY A/C NAME:</Text>
                  <Text style={styles.bankInfoValueLine}>OZMAE FREIGHT SOLUTIONS LIMITED</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>BENEFICIARY A/C NUMBER:</Text>
                  <Text style={styles.bankInfoValueLine}>3391630086-USD</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>ACCOUNT CURRENCY:</Text>
                  <Text style={styles.bankInfoValueLineNormal}>USD</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>BANK BRANCH:</Text>
                  <Text style={styles.bankInfoValueLineNormal}>ARUSHA BRANCH</Text>
                </View>
                <View style={styles.bankInfoRow}>
                  <Text style={styles.bankInfoLabel}>BENEFICIARY ADDRESS:</Text>
                  <Text style={styles.bankInfoValueLineNormal}>ARUSHA, TANZANIA</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* SIGNATURES */}
        <View style={styles.signatureSection}>
          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>DELIVERED / ISSUED BY:</Text>
            <Text style={styles.sigLine}>NAME: OSMOND MOSHA</Text>
            <Text style={styles.sigLine}>DATE: {format(new Date(), "dd MMM yyyy")}</Text>
            <Text style={[styles.sigLine, { marginTop: 6 }]}>SIGNATURE:</Text>
            <Image src={signatureImg} style={[styles.sigLineBorder, { objectFit: "contain", height: 55, borderBottomWidth: 0, paddingBottom: 2, borderBottomColor: "transparent", marginLeft: -15, width: 160 }]} />
            <View style={{ borderBottomWidth: 1, borderBottomColor: "#1E293B", width: "100%" }}></View>
          </View>

          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>RECEIVED / AUTHORIZED BY:</Text>
            <Text style={styles.sigLine}>NAME: _____________________</Text>
            <Text style={styles.sigLine}>DATE: _____________________</Text>
            <Text style={[styles.sigLine, { marginTop: 6 }]}>SIGNATURE:</Text>
            <View style={{ height: 55 }} />
            <View style={{ borderBottomWidth: 1, borderBottomColor: "#1E293B", width: "100%" }}></View>
          </View>
        </View>

        <Text style={styles.footerText}>
          Notice must be given to us of any goods not received within 10 days taken from the date of despatch stated on Invoice.
          {"\n"}Any Shortage or damage must be notified within 72 hours of receipt of goods.
          {"\n"}Thank you for your business!
        </Text>
      </Page>
    </Document>
  );
};
