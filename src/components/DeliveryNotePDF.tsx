import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { format } from "date-fns";

const styles = StyleSheet.create({
  page: { padding: 50, backgroundColor: "#FFFFFF", fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#0F172A",
    paddingBottom: 20,
  },
  companyName: { fontSize: 18, fontWeight: "bold", color: "#0F172A" },
  companySubtext: { fontSize: 9, color: "#64748B", marginTop: 2 },
  titleSection: { textAlign: "right" },
  title: { fontSize: 20, fontWeight: "bold", color: "#0F172A", textTransform: "uppercase" },
  metaText: { fontSize: 9, color: "#475569", marginTop: 2 },
  section: { marginBottom: 25 },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 4,
    marginBottom: 8,
  },
  grid: { flexDirection: "row", gap: 20 },
  gridCol: { flex: 1 },
  label: { fontSize: 8, color: "#94A3B8", textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 10, color: "#1E293B", fontWeight: "bold" },
  table: { marginTop: 10, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#F8FAFC", padding: 8, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tableRow: { flexDirection: "row", padding: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  tableCell: { fontSize: 9, color: "#1E293B" },
  conditionSection: { marginTop: 20, padding: 10, backgroundColor: "#F8FAFC", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: "#10B981" },
  conditionText: { fontSize: 9, color: "#475569", fontStyle: "italic" },
  signatureSection: { flexDirection: "row", justifyContent: "space-between", marginTop: 50 },
  signatureBox: { width: "45%", borderTopWidth: 1, borderTopColor: "#CBD5E1", paddingTop: 8, textAlign: "center" },
  signatureLabel: { fontSize: 8, color: "#64748B", textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 30, left: 50, right: 50, textAlign: "center", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 10 },
  footerText: { fontSize: 8, color: "#94A3B8" }
});

interface Props {
  job: any;
  details: any;
}

export const DeliveryNotePDF = ({ job, details }: Props) => (
  <Document title={`Delivery Note - ${job.id.split('-')[0]}`}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>Ozmae Freight Solutions</Text>
          <Text style={styles.companySubtext}>Logistics & Infrastructure Excellence</Text>
        </View>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Delivery Note</Text>
          <Text style={styles.metaText}>Ref: {job.id.split('-')[0].toUpperCase()}</Text>
          <Text style={styles.metaText}>Date: {format(new Date(), "PP")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivery Destination</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Consignee / End Destination</Text>
            <Text style={styles.value}>{job.destination}</Text>
            <Text style={[styles.value, { marginTop: 4 }]}>{details.consignee_name || 'N/A'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Arrival Date/Time</Text>
            <Text style={styles.value}>{details.delivery_datetime || format(new Date(), "PPpp")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Delivered Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { width: "60%", fontWeight: "bold" }]}>Item Description</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "center", fontWeight: "bold" }]}>Qty Delivered</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "right", fontWeight: "bold" }]}>Weight (KG)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "60%" }]}>{job.cargo_description || "General Cargo"}</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>{details.quantity || "1 Unit"}</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>{job.cargo_weight_kg || "—"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.conditionSection}>
        <Text style={[styles.label, { color: "#10B981" }]}>Condition Verification</Text>
        <Text style={styles.conditionText}>
          Cargo received in good order and condition. No visible damage or discrepancies noted at the time of delivery.
        </Text>
      </View>

      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>Driver / Carrier Signature</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>Consignee's Signature & Stamp</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ozmae Freight Solutions • Proof of Delivery Document</Text>
      </View>
    </Page>
  </Document>
);
