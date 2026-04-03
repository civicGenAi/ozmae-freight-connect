import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { QuotationMetadata } from "./QuotationTemplateEditor";

// Note: In a real environment, you'd register custom fonts here for better branding
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 0,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica", // standard safe font
    fontSize: 10,
    color: "#333333",
  },
  topBorder: {
    height: 6,
    width: "100%",
    backgroundColor: "#0a1e3f",
  },
  header: {
    paddingHorizontal: 40,
    paddingVertical: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    width: "45%",
  },
  logo: {
    width: 220,
    height: "auto",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDivider: {
    width: 2,
    height: 70,
    backgroundColor: "#000",
    marginRight: 15,
    borderRadius: 2,
    opacity: 0.8,
  },
  headerTextContainer: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#404040",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  contactInfo: {
    fontSize: 9,
    color: "#404040",
    marginBottom: 1,
  },
  titleBar: {
    backgroundColor: "#0a1e3f",
    paddingVertical: 12,
    paddingHorizontal: 40,
    textAlign: "center",
    marginBottom: 15,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  body: {
    paddingHorizontal: 40,
    flexDirection: "row",
    gap: 20,
  },
  leftColumn: {
    width: "38%",
    borderWidth: 1,
    borderColor: "#000",
  },
  detailsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    minHeight: 24,
  },
  detailsLabel: {
    width: "45%",
    backgroundColor: "#fafafa",
    padding: 5,
    borderRightWidth: 1,
    borderRightColor: "#000",
    fontWeight: "bold",
    fontSize: 9,
  },
  detailsValue: {
    width: "55%",
    padding: 5,
    fontSize: 9,
  },
  rightColumn: {
    flex: 1,
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#FFFFFF",
  },
  tableHeaderCell: {
    padding: 6,
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 24,
  },
  tableCell: {
    padding: 5,
    fontSize: 9,
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#F26B2A",
    color: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  totalLabel: {
    padding: 6,
    fontWeight: "bold",
    fontSize: 10,
    textTransform: "uppercase",
    color: "#FFF",
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  totalValue: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontWeight: "bold",
    fontSize: 10,
    textAlign: "right",
    color: "#FFF",
    borderRightWidth: 1,
    borderRightColor: "#000",
  },
  footer: {
    paddingHorizontal: 40,
    marginTop: "auto",
    paddingBottom: 40,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerColumn: {
    width: "30%",
  },
  footerText: {
    fontSize: 9,
    color: "#666",
    lineHeight: 1.4,
  },
  signatureContainer: {
    position: "relative",
    marginTop: 5,
    marginBottom: 5,
  },
  signatureImg: {
    position: "absolute",
    top: 5,
    left: 0,
    width: 120,
    height: 45,
    zIndex: 10,
  }
});

interface Props {
  meta: QuotationMetadata;
  logoUrl: string;
  signatureUrl: string;
}

export const QuotationPDFDocument = ({ meta, logoUrl, signatureUrl }: Props) => {
  const colCount = meta.tableHeaders.length;
  
  const getColWidth = (idx: number) => {
    if (colCount === 3) {
      if (idx === 0) return "55%";
      if (idx === 1) return "25%";
      return "20%";
    } else {
      if (idx === 0) return "40%";
      if (idx === colCount - 1) return "20%";
      return `${(40 / (colCount - 2))}%`;
    }
  };

  const getRowValue = (row: any, colIdx: number) => {
    if (colIdx === 0) return row.desc || "";
    if (colIdx === colCount - 1) return row.remarks || "";
    if (colIdx === 1) return row.amount || "";
    return row.extraCols ? (row.extraCols[colIdx - 2] || "") : "";
  };

  const getTotalValue = (colIdx: number) => {
    if (colIdx === 0) return "TOTAL";
    if (colIdx === colCount - 1) return "";
    if (colIdx === 1) return meta.totalAmountText || "0.00";
    return (meta as any).extraTotalAmounts?.[colIdx - 2] || "";
  };

  // Convert raw footer notes to segments if they contain signatures
  // For simplicity, we'll draw the signature image over the standard text flow in the footerColumn
  
  return (
    <Document title={`Quotation - ${meta.leftFields.find(f => f.label.includes('Customer'))?.value || 'Ozmae'}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topBorder} />
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image src={logoUrl} style={styles.logo} />
          </View>
          
          <View style={styles.headerInfo}>
            <View style={styles.headerDivider} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.companyName}>Ozmae Freight Solutions</Text>
              <Text style={styles.contactInfo}>Arusha, Tanzania East Africa</Text>
              <Text style={styles.contactInfo}>info@ozmaelogistics.com</Text>
              <Text style={styles.contactInfo}>www.ozmaelogistics.com</Text>
              <Text style={[styles.contactInfo, { fontWeight: "bold" }]}>+255 787 240 780 | +255 754 757 670</Text>
            </View>
          </View>
        </View>

        {/* Title Bar */}
        <View style={styles.titleBar}>
          <Text style={styles.titleText}>{meta.titleText}</Text>
        </View>

        {/* Body Content */}
        <View style={styles.body}>
          {/* Left Column Matrix */}
          <View style={styles.leftColumn}>
            {meta.leftFields.map((field, idx) => (
              <View key={idx} style={[styles.detailsRow, idx === meta.leftFields.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.detailsLabel}>
                  <Text>{field.label}</Text>
                </View>
                <View style={styles.detailsValue}>
                  <Text>{field.value}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Right Column Table */}
          <View style={styles.rightColumn}>
            <View style={styles.table}>
              {/* Headers */}
              <View style={styles.tableHeader}>
                {meta.tableHeaders.map((header, idx) => (
                  <View key={idx} style={[styles.tableHeaderCell, { width: getColWidth(idx) }, idx === colCount - 1 && { borderRightWidth: 0 }]}>
                    <Text style={idx === colCount - 1 && { textAlign: 'center' }}>{header}</Text>
                  </View>
                ))}
              </View>

              {/* Rows */}
              {meta.tableRows.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.tableRow}>
                  {meta.tableHeaders.map((_, colIdx) => {
                    const isRemarks = colIdx === colCount - 1;
                    const hideBottomBorder = isRemarks && row.mergeRemark && rowIdx !== meta.tableRows.length - 1;
                    
                    return (
                      <View key={colIdx} style={[
                        styles.tableCell, 
                        { width: getColWidth(colIdx) }, 
                        isRemarks && { borderRightWidth: 0 },
                        (rowIdx === meta.tableRows.length - 1 || hideBottomBorder) ? { borderBottomWidth: 0 } : { borderBottomWidth: 1, borderBottomColor: "#eee" }
                      ]}>
                        <Text style={[
                          colIdx > 0 && !isRemarks && { textAlign: 'right' },
                          isRemarks && { textAlign: 'center' }
                        ]}>
                          {getRowValue(row, colIdx)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}

              {/* Total Row */}
              <View style={styles.totalRow}>
                {meta.tableHeaders.map((_, idx) => {
                   const isFirst = idx === 0;
                   const isLast = idx === colCount - 1;
                   const val = getTotalValue(idx);
                   
                   return (
                     <View key={idx} style={[
                        isFirst ? styles.totalLabel : styles.totalValue, 
                        { width: getColWidth(idx) },
                        isLast && { borderRightWidth: 0 }
                      ]}>
                       <Text>{val}</Text>
                     </View>
                   );
                })}
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          {/* Footer Left Column with Signature */}
          <View style={styles.footerColumn}>
             {/* We manually place signature over the Sincerely block */}
             <Text style={styles.footerText}>Yours Sincerely,</Text>
             
             <View style={styles.signatureContainer}>
                <Image src={signatureUrl} style={styles.signatureImg} />
                <View style={{ height: 45 }} /> {/* Placeholder gap */}
             </View>
             
             <Text style={[styles.footerText, { fontWeight: 'bold' }]}>OSMOND MOSHA</Text>
             <Text style={styles.footerText}>DIRECTOR/FOUNDER</Text>
             <Text style={styles.footerText}>Ozmae Freight Solutions</Text>
             <Text style={styles.footerText}>Tel. +255 787 240 780</Text>
             <Text style={styles.footerText}>Email: info@ozmaelogistics.com</Text>
          </View>

          <View style={styles.footerColumn}>
             <Text style={styles.footerText}>{meta.footerNotesMiddle}</Text>
          </View>

          <View style={styles.footerColumn}>
             <Text style={styles.footerText}>{meta.footerNotesRight}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
