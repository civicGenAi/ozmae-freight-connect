import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: "#0F172A",
    paddingBottom: 20,
  },
  companyInfo: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 20,
    fontWeight: "heavy",
    color: "#0F172A",
    marginBottom: 4,
  },
  companySubtext: {
    fontSize: 9,
    color: "#64748B",
    marginBottom: 2,
  },
  invoiceMeta: {
    textAlign: "right",
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0F172A",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  metaText: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 3,
  },
  addressSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
  },
  addressBox: {
    width: "45%",
  },
  addressTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#64748B",
    textTransform: "uppercase",
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
  },
  addressName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 10,
    color: "#475569",
    marginBottom: 2,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  tableCell: {
    fontSize: 10,
    color: "#1E293B",
  },
  totalsSection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },
  totalsBox: {
    width: "40%",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  totalValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1E293B",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0F172A",
    padding: 12,
    marginTop: 8,
    borderRadius: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  grandTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  paymentTerms: {
    marginTop: 40,
    padding: 15,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  paymentSplit: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  splitItem: {
    fontSize: 9,
    color: "#475569",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 20,
  },
  footerText: {
    fontSize: 8,
    color: "#94A3B8",
  }
});

interface Props {
  invoice: any;
}

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const InvoicePDF = ({ invoice }: Props) => {
  return (
    <Document title={`${invoice.invoice_number}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>Ozmae Freight Solutions</Text>
            <Text style={styles.companySubtext}>Plot 14, Nyerere Road</Text>
            <Text style={styles.companySubtext}>Dar es Salaam, Tanzania</Text>
            <Text style={styles.companySubtext}>TIN: 123-456-789</Text>
          </View>
          <View style={styles.invoiceMeta}>
            <Text style={styles.invoiceTitle}>Invoice</Text>
            <Text style={styles.metaText}>Number: {invoice.invoice_number}</Text>
            <Text style={styles.metaText}>Date: {format(new Date(invoice.created_at), "MMM dd, yyyy")}</Text>
            <Text style={styles.metaText}>Due: {invoice.deposit_due_date ? format(new Date(invoice.deposit_due_date), "MMM dd, yyyy") : 'N/A'}</Text>
          </View>
        </View>

        {/* Address Section */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <Text style={styles.addressTitle}>Bill To</Text>
            <Text style={styles.addressName}>{invoice.job?.customer?.company_name || 'Valued Customer'}</Text>
            <Text style={styles.addressDetail}>Registered Logistics Partner</Text>
          </View>
          <View style={styles.addressBox}>
             <Text style={styles.addressTitle}>Job Details</Text>
             <Text style={styles.addressDetail}>Reference: JOB-{invoice.job_order_id?.split('-')[0].toUpperCase()}</Text>
             <Text style={styles.addressDetail}>Route: {invoice.job?.origin} to {invoice.job?.destination}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "60%" }]}>Description</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%", textAlign: "center" }]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Price</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "right" }]}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "60%" }]}>Transport & Logistics Services - Heavy Cargo</Text>
            <Text style={[styles.tableCell, { width: "10%", textAlign: "center" }]}>1</Text>
            <Text style={[styles.tableCell, { width: "15%", textAlign: "right" }]}>{formatCurrency(invoice.total_amount_usd)}</Text>
            <Text style={[styles.tableCell, { width: "15%", textAlign: "right", fontWeight: "bold" }]}>{formatCurrency(invoice.total_amount_usd)}</Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal_usd || invoice.total_amount_usd)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>VAT (0%)</Text>
              <Text style={styles.totalValue}>$0.00</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total Due</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice.total_amount_usd)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Terms */}
        <View style={styles.paymentTerms}>
          <Text style={styles.paymentTitle}>Payment Schedule</Text>
          <View style={styles.paymentSplit}>
             <Text style={styles.splitItem}>First Installment (60% Deposit):</Text>
             <Text style={[styles.splitItem, { fontWeight: "bold" }]}>{formatCurrency(invoice.deposit_amount_usd)}</Text>
          </View>
          <View style={styles.paymentSplit}>
             <Text style={styles.splitItem}>Final Installment (40% Balance):</Text>
             <Text style={[styles.splitItem, { fontWeight: "bold" }]}>{formatCurrency(invoice.balance_amount_usd)}</Text>
          </View>
          <View style={[styles.paymentSplit, { marginTop: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0", paddingTop: 8 }]}>
             <Text style={[styles.splitItem, { fontSize: 8, fontStyle: "italic" }]}>Payment Terms: 60% Payable upfront, 40% upon completion.</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for choosing Ozmae Freight Solutions.</Text>
          <Text style={[styles.footerText, { marginTop: 4 }]}>www.ozmaelogistics.com | info@ozmaelogistics.com</Text>
        </View>
      </Page>
    </Document>
  );
};
