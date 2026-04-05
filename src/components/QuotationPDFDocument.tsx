import React from "react";
import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer";
import { QuotationMetadata } from "./QuotationTemplateEditor";

// Note: In a real environment, you'd register custom fonts here for better branding
// Font.register({ family: 'Inter', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#FFFFFF",
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: "#333333",
  },
  topBorder: {
    padding: 0,
    height: 4,
    width: "100%",
    backgroundColor: "#0a1e3f",
    position: 'absolute',
    top: 0,
    left: 0,
  },
  header: {
    paddingVertical: 15,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoContainer: {
    width: "40%",
  },
  logo: {
    width: 200,
    height: "auto",
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerDivider: {
    width: 1.5,
    height: 60,
    backgroundColor: "#0a1e3f",
    marginRight: 10,
    opacity: 0.9,
  },
  headerTextContainer: {
    flexDirection: "column",
  },
  companyName: {
    fontSize: 16,
    fontWeight: "heavy",
    color: "#0a1e3f",
    textTransform: "uppercase",
    marginBottom: 1,
  },
  contactInfo: {
    fontSize: 8,
    color: "#404040",
    marginBottom: 0.5,
  },
  titleBar: {
    backgroundColor: "#0a1e3f",
    paddingVertical: 10,
    paddingHorizontal: 20,
    textAlign: "center",
    marginBottom: 15,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 20,
  },
  leftColumn: {
    width: "35%",
    borderWidth: 0.8,
    borderColor: "#000",
    alignSelf: 'flex-start',
  },
  detailsRow: {
    flexDirection: "row",
    borderBottomWidth: 0.8,
    borderBottomColor: "#000",
    minHeight: 20,
  },
  detailsLabel: {
    width: "45%",
    backgroundColor: "#f5f5f5",
    padding: 4,
    borderRightWidth: 0.8,
    borderRightColor: "#000",
    fontWeight: "bold",
    fontSize: 8.5,
    textTransform: "uppercase",
  },
  detailsValue: {
    width: "55%",
    padding: 4,
    fontSize: 8.5,
  },
  rightColumn: {
    flex: 1,
  },
  table: {
    borderWidth: 0.8,
    borderColor: "#000",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    backgroundColor: "#f5f5f5",
  },
  tableHeaderCell: {
    padding: 5,
    fontWeight: "bold",
    fontSize: 8.5,
    textTransform: "uppercase",
    borderRightWidth: 0.8,
    borderRightColor: "#000",
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 20,
  },
  tableCell: {
    paddingVertical: 5,
    paddingHorizontal: 5,
    fontSize: 8.5,
    borderRightWidth: 0.8,
    borderRightColor: "#000",
    flexDirection: "column",
    justifyContent: "center",
  },
  headerRowBG: {
    backgroundColor: "#fafafa",
  },
  headerText: {
    fontWeight: "bold",
    fontSize: 9,
    color: "#0a1e3f",
  },
  itemIndent: {
    paddingLeft: 14,
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#0a1e3f",
    color: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#000",
  },
  totalLabel: {
    padding: 6,
    fontWeight: "bold",
    fontSize: 9,
    textTransform: "uppercase",
    color: "#FFFFFF",
    borderRightWidth: 0.8,
    borderRightColor: "#FFFFFF",
  },
  totalValue: {
    padding: 6,
    fontWeight: "bold",
    fontSize: 9.5,
    textAlign: "right",
    color: "#FFFFFF",
    borderRightWidth: 0.8,
    borderRightColor: "#FFFFFF",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: "#999",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerColumn: {
    width: "32%",
  },
  footerText: {
    fontSize: 8,
    color: "#444",
    lineHeight: 1.3,
  },
  footerHeader: {
    fontSize: 8.5,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 4,
    color: "#0a1e3f",
  },
  signatureContainer: {
    paddingVertical: 2,
  },
  signatureImg: {
    width: 100,
    height: "auto",
  }
});

interface Props {
  meta: QuotationMetadata;
  logoUrl: string;
  signatureUrl: string;
}

export const QuotationPDFDocument = ({ meta, logoUrl, signatureUrl }: Props) => {
  const colCount = meta.tableHeaders.length;
  
  // Helpers
  const cleanAmount = (val: any) => {
    if (!val || val === "-" || val === "—") return 0;
    // Extract only digits, decimal point, and minus sign
    const cleaned = String(val).replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const formatAmount = (val: any) => {
    const num = typeof val === 'number' ? val : cleanAmount(val);
    if (!num || num === 0) return "—";
    return `$ ${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getColWidth = (idx: number) => {
    const total = colCount;
    // Description (idx 0) takes 45%
    if (idx === 0) return "48%";
    // Remarks (last) takes 18%
    if (idx === total - 1) return "20%";
    
    // Remaining cols share the middle
    const remaining = 100 - 48 - 20;
    const midCount = total - 2;
    return `${remaining / midCount}%`;
  };

  const getRowValue = (row: any, colIdx: number) => {
    if (colIdx === 0) return row.desc || "";
    if (colIdx === colCount - 1) return row.remarks || "";
    if (colIdx === 1) return row.amount || "";
    return row.extraCols ? (row.extraCols[colIdx - 2] || "") : "";
  };

  const calculateTotal = (colIdx: number) => {
    if (colIdx === 0) return "TOTAL AMOUNT (USD)";
    if (colIdx === colCount - 1) return "";
    
    const sum = meta.tableRows.reduce((acc, row) => {
       if (row.type !== 'item') return acc;
       const val = getRowValue(row, colIdx);
       return acc + cleanAmount(val);
    }, 0);

    return formatAmount(sum);
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
              {meta.tableRows.map((row, rowIdx) => {
                const isHeaderLine = row.type === 'header';
                return (
                  <View key={rowIdx} style={[styles.tableRow, isHeaderLine && styles.headerRowBG]}>
                    {meta.tableHeaders.map((_, colIdx) => {
                      const isDesc = colIdx === 0;
                      const isPricing = colIdx > 0 && colIdx < colCount - 1;
                      const isRemarks = colIdx === colCount - 1;
                      const value = getRowValue(row, colIdx);

                      return (
                        <View key={colIdx} style={[
                          styles.tableCell, 
                          { width: getColWidth(colIdx) }, 
                          isRemarks && { borderRightWidth: 0 },
                          (rowIdx === meta.tableRows.length - 1) ? { borderBottomWidth: 0 } : { borderBottomWidth: 0.5, borderBottomColor: "#eee" }
                        ]}>
                          {isPricing ? (
                             <Text style={[
                               { textAlign: 'right', fontWeight: 'bold' },
                               isHeaderLine && { opacity: 0 }
                             ]}>
                               {isHeaderLine ? "" : formatAmount(value)}
                             </Text>
                          ) : (
                            <Text style={[
                              isDesc && isHeaderLine && styles.headerText,
                              isDesc && !isHeaderLine && styles.itemIndent,
                              isRemarks && { textAlign: 'center', fontSize: 7.5, color: '#666' },
                              { width: '100%' }
                            ]}>
                              {value}
                            </Text>
                          )}
                        </View>
                      );
                    })}
                  </View>
                );
              })}

              {/* Total Row */}
              <View style={styles.totalRow}>
                {meta.tableHeaders.map((_, idx) => {
                   const isFirst = idx === 0;
                   const isLast = idx === colCount - 1;
                   const val = calculateTotal(idx);
                   
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

        {/* Footer Area */}
        <View style={styles.footer}>
          {/* Sincerely Zone */}
          <View style={styles.footerColumn}>
             <Text style={styles.footerText}>Yours Sincerely,</Text>
             
             <View style={styles.signatureContainer}>
                <Image src={signatureUrl} style={styles.signatureImg} />
             </View>
             
             <Text style={[styles.footerText, { fontWeight: 'bold' }]}>OSMOND MOSHA</Text>
             <Text style={styles.footerText}>DIRECTOR/FOUNDER</Text>
             <Text style={styles.footerText}>Ozmae Freight Solutions</Text>
             <Text style={styles.footerText}>Tel. +255 787 240 780 | +255 754 757 670</Text>
             <Text style={styles.footerText}>Email: info@ozmaelogistics.com</Text>
          </View>

          <View style={styles.footerColumn}>
             <Text style={styles.footerHeader}>NOT INCLUDED</Text>
             <Text style={styles.footerText}>{meta.footerNotesMiddle}</Text>
          </View>

          <View style={styles.footerColumn}>
             <Text style={styles.footerHeader}>Important Documents:</Text>
             <Text style={styles.footerText}>{meta.footerNotesRight}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
