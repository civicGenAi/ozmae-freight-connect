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

export const PickupPDF = ({ job, details }: Props) => (
  <Document title={`Pickup Confirmation - ${job.id.split('-')[0]}`}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.companyName}>Ozmae Freight Solutions</Text>
          <Text style={styles.companySubtext}>Logistics & Infrastructure Excellence</Text>
        </View>
        <View style={styles.titleSection}>
          <Text style={styles.title}>Pickup Order</Text>
          <Text style={styles.metaText}>Ref: {job.id.split('-')[0].toUpperCase()}</Text>
          <Text style={styles.metaText}>Date: {format(new Date(), "PP")}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pickup Locations & Schedule</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Origin Address</Text>
            <Text style={styles.value}>{job.origin}</Text>
            <Text style={[styles.value, { marginTop: 4 }]}>{details.shipper_name || 'N/A'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Scheduled Date/Time</Text>
            <Text style={styles.value}>{details.pickup_datetime || format(new Date(), "PPpp")}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cargo Description</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCell, { width: "60%", fontWeight: "bold" }]}>Item Description</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "center", fontWeight: "bold" }]}>Qty/Unit</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "right", fontWeight: "bold" }]}>Weight (KG)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: "60%" }]}>{job.cargo_description || "General Cargo"}</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "center" }]}>{details.quantity || "1 Unit"}</Text>
            <Text style={[styles.tableCell, { width: "20%", textAlign: "right" }]}>{job.cargo_weight_kg || "—"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Carrier Information</Text>
        <View style={styles.grid}>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Driver Name</Text>
            <Text style={styles.value}>{details.driver_name || "Assigned Carrier"}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.label}>Vehicle Plate</Text>
            <Text style={styles.value}>{details.vehicle_plate || "T-000-XXX"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.signatureSection}>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>Shipper's Signature & Stamp</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text style={styles.signatureLabel}>Driver's Signature</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Ozmae Freight Solutions • Standard Logistics Operations Doc</Text>
      </View>
    </Page>
  </Document>
);
