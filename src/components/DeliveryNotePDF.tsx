import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { format } from "date-fns";
import signatureImg from "@/assets/signature.png";
import logoImg from "@/assets/ozmae-logo.png";

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
    width: "45%",
    justifyContent: "center",
  },
  logoImage: {
    width: 150,
    height: 60,
    objectFit: "contain",
  },
  docTitleBox: {
    width: "45%",
    alignItems: "flex-end",
  },
  docTitle: {
    fontSize: 22,
    color: "#1E293B", // Navy Blue
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    marginBottom: 5,
  },
  metaGrid: {
    flexDirection: "column",
    width: "100%",
    alignItems: "flex-end",
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
    borderColor: "#1E293B",
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
    backgroundColor: "#F8FAFC",
  },
  tableRowEven: {
    backgroundColor: "#FFFFFF",
  },
  tableCell: {
    fontSize: 8,
    color: "#1E293B",
  },
  tableCellBold: {
    fontSize: 8,
    color: "#1E293B",
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
  },
  // SIGNATURES
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 15,
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
  },
  footerText: {
    marginTop: 15,
    textAlign: "center",
    fontSize: 7,
    color: "#64748B",
    fontStyle: "italic",
  },
  footerBold: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    fontWeight: "bold",
    color: "#1E293B",
  }
});

interface DeliveryNoteProps {
  job: any;
  deliveryNoteNumber?: string;
  overrides?: {
    deliveredBy?: string;
    shippingAddress?: string;
    invoiceAddress?: string;
    despatchDate?: string;
    deliveryMethod?: string;
    itemDescription?: string;
    orderedQty?: string;
    deliveredQty?: string;
    outstandingQty?: string;
    items?: Array<{
      description: string;
      ordered: string;
      delivered: string;
      outstanding: string;
    }>;
    orderId?: string;
    customerId?: string;
  };
}

export const DeliveryNotePDF = ({ job, deliveryNoteNumber, overrides }: DeliveryNoteProps) => {
  const noteNum = deliveryNoteNumber || (job?.id ? `DN-${job.id.split('-')[0].toUpperCase()}` : 'N/A');
  const deliveredBy = overrides?.deliveredBy !== undefined ? overrides.deliveredBy : "";
  const despatchDate = overrides?.despatchDate ? overrides.despatchDate : "";
  
  return (
    <Document title={`Delivery_Note_${noteNum}`}>
      <Page size="A4" style={styles.page}>
        
        {/* TOP SECTION */}
        <View style={styles.topSection}>
          <View style={styles.logoBox}>
            <Image src={logoImg} style={styles.logoImage} />
          </View>
          <View style={styles.docTitleBox}>
            <Text style={styles.docTitle}>Delivery Note</Text>
            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order Date:</Text>
                <Text style={styles.metaValue}>{job?.created_at ? format(new Date(job.created_at), "MMM dd, yyyy") : format(new Date(), "MMM dd, yyyy")}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order #:</Text>
                <Text style={styles.metaValue}>{`JOB-${job?.id?.split('-')[0].toUpperCase() || 'N/A'}`}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Delivery Note #:</Text>
                <Text style={styles.metaValue}>{noteNum}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Customer ID:</Text>
                <Text style={styles.metaValue}>{job?.customer?.company_name ? job.customer.company_name.substring(0,4).toUpperCase() + '-1000' : 'CUST-1000'}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Despatch Date:</Text>
                <Text style={styles.metaValue}>{despatchDate}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Delivery Method:</Text>
                <Text style={styles.metaValue}>{overrides?.deliveryMethod || "ROAD"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ADDRESSES */}
        <View style={styles.addressSection}>
          <View style={styles.addressBox}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressHeaderText}>Shipping Address</Text>
            </View>
            <Text style={styles.addressTextBold}>{job?.customer?.company_name || 'Customer Name'}</Text>
            <MultiLineText
              text={overrides?.shippingAddress !== undefined ? overrides.shippingAddress : (job?.destination && job.destination !== "TBA" ? job.destination : "")}
              style={styles.addressTextLine}
            />
            <Text style={styles.addressTextLine}>Tanzania, East Africa</Text>
          </View>
          
          <View style={styles.addressBox}>
            <View style={styles.addressHeader}>
              <Text style={styles.addressHeaderText}>Invoice Address</Text>
            </View>
            <Text style={styles.addressTextBold}>{job?.customer?.company_name || 'Customer Name'}</Text>
            <MultiLineText
              text={overrides?.invoiceAddress !== undefined ? overrides.invoiceAddress : ""}
              style={styles.addressTextLine}
            />
            <Text style={styles.addressTextLine}></Text>
          </View>
        </View>

        {/* TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { width: "10%" }]}>Item #</Text>
            <Text style={[styles.tableHeaderCell, { width: "50%" }]}>Description (Container Number)</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Ordered</Text>
            <Text style={[styles.tableHeaderCell, { width: "15%", textAlign: "center" }]}>Delivered</Text>
            <Text style={[styles.tableHeaderCell, { width: "10%", textAlign: "center" }]}>Outstanding</Text>
          </View>
          
          {overrides?.items && overrides.items.length > 0 ? (
            overrides.items.map((item, idx) => (
              <View style={styles.tableRow} key={idx}>
                <Text style={[styles.tableCellBold, { width: "10%" }]}>{idx + 1}</Text>
                <View style={{ width: "50%" }}>
                  <MultiLineText text={item.description} style={styles.tableCellBold} />
                </View>
                <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>{item.ordered}</Text>
                <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>{item.delivered}</Text>
                <Text style={[styles.tableCell, { width: "10%", textAlign: "center" }]}>{item.outstanding}</Text>
              </View>
            ))
          ) : (
            <View style={styles.tableRow}>
              <Text style={[styles.tableCellBold, { width: "10%" }]}>1</Text>
              <View style={{ width: "50%" }}>
                <MultiLineText
                  text={overrides?.itemDescription || `Cargo Transport: ${job?.origin} to ${job?.destination}`}
                  style={styles.tableCellBold}
                />
              </View>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>{overrides?.orderedQty || "1"}</Text>
              <Text style={[styles.tableCell, { width: "15%", textAlign: "center" }]}>{overrides?.deliveredQty || "1"}</Text>
              <Text style={[styles.tableCell, { width: "10%", textAlign: "center" }]}>{overrides?.outstandingQty || "0"}</Text>
            </View>
          )}

          {/* Add a few empty rows for styling, like the template */}
          <View style={styles.tableRowEven}>
            <Text style={[styles.tableCell, { width: "10%" }]}></Text>
            <Text style={[styles.tableCell, { width: "50%" }]}></Text>
            <Text style={[styles.tableCell, { width: "15%" }]}></Text>
            <Text style={[styles.tableCell, { width: "15%" }]}></Text>
            <Text style={[styles.tableCell, { width: "10%" }]}></Text>
          </View>
          <View style={styles.tableRow}>
             <Text style={[styles.tableCell, { width: "10%" }]}></Text>
             <Text style={[styles.tableCell, { width: "50%" }]}></Text>
             <Text style={[styles.tableCell, { width: "15%" }]}></Text>
             <Text style={[styles.tableCell, { width: "15%" }]}></Text>
             <Text style={[styles.tableCell, { width: "10%" }]}></Text>
          </View>
        </View>

        {/* SIGNATURES */}
        <View style={styles.signatureSection}>
          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>DELIVERED BY:</Text>
            <Text style={styles.sigLine}>NAME: {deliveredBy ? deliveredBy : "_____________________"}</Text>
            <Text style={styles.sigLine}>DATE: {deliveredBy ? format(new Date(), "dd MMMM yyyy") : "_____________________"}</Text>
            <Text style={[styles.sigLine, { marginTop: 6 }]}>SIGNATURE:</Text>
            {deliveredBy.toUpperCase().includes("OSMOND MOSHA") ? (
              <Image src={signatureImg} style={{ objectFit: "contain", height: 55, marginLeft: -15, width: 160, paddingBottom: 2 }} />
            ) : (
              <View style={{ height: 55 }} />
            )}
            <View style={styles.sigLineBorder}></View>
          </View>
          <View style={styles.sigBox}>
            <Text style={styles.sigTitle}>RECEIVED BY:</Text>
            <Text style={styles.sigLine}>NAME: _____________________</Text>
            <Text style={styles.sigLine}>DATE: _____________________</Text>
            <Text style={[styles.sigLine, { marginTop: 6 }]}>SIGNATURE:</Text>
            <View style={{ height: 55 }} />
            <View style={styles.sigLineBorder}></View>
          </View>
        </View>

        <Text style={styles.footerText}>
          Notice must be given to us of any goods not received within 10 days taken from the date of despatch stated on invoice.
          {"\n"}Any Shortage or damage must be notified within 72 hours of receipt of goods.
        </Text>
        <Text style={styles.footerBold}>
          Thank you for your business!
        </Text>
      </Page>
    </Document>
  );
};
