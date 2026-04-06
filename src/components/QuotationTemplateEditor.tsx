import React, { useState, useEffect, useRef } from "react";
import { X, Save, Download, Plus, Trash2, Printer, Link2, Unlink, FileText, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import ozmaeLogoImg from "@/assets/ozmae-logo.png";
// @ts-ignore
import signatureImg from "@/assets/signature.png";
import { cn } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { QuotationPDFDocument } from "./QuotationPDFDocument";

// --- Types ---
export interface QuotationMetadata {
  titleText: string;
  leftFields: { label: string; value: string }[];
  tableHeaders: string[]; // typically ["DESCRIPTION", "30Tons", "REMARKS"]
  tableRows: { type: "header" | "item"; desc: string; amount: string; remarks: string; extraCols?: string[]; mergeRemark?: boolean; indent?: number }[];
  totalAmountText: string;
  footerNotesLeft: string;
  footerNotesMiddle: string;
  footerNotesRight: string;
}

const DEFAULT_METADATA: QuotationMetadata = {
  titleText: "CLEARANCE CHARGES DAR ES SALAAM PORT TO BUGESERA AIRPORT RWANDA",
  leftFields: [
    { label: "Date :", value: "" },
    { label: "Customer :", value: "" },
    { label: "Contact Person :", value: "" },
    { label: "Commodity :", value: "" },
    { label: "Destination :", value: "" },
    { label: "Currency :", value: "USD" },
    { label: "Validity :", value: "" },
    { label: "Chargeable weight :", value: "" },
    { label: "CIF VALUE(USD) :", value: "" },
  ],
  tableHeaders: ["DESCRIPTION", "30Tons", "REMARKS"],
  tableRows: [
    { type: "item", desc: "Agency fee", amount: "", remarks: "" },
    { type: "item", desc: "Customs Documentation & Verification", amount: "", remarks: "" },
    { type: "item", desc: "Port Charges", amount: "", remarks: "" },
    { type: "item", desc: "Shipping Line Charges", amount: "", remarks: "" },
    { type: "item", desc: "Border Clearance Tanzania/Rwanda", amount: "", remarks: "" },
    { type: "item", desc: "Transport from Dar es salaam to Rwanda +permit & escort", amount: "", remarks: "" },
    { type: "item", desc: "Duties & Taxes", amount: "", remarks: "" },
  ],
  totalAmountText: "",
  footerNotesLeft: "Yours Sincerely,\n\n\n\n\nOSMOND MOSHA\nDIRECTOR/FOUNDER\nOzmae Freight Solutions\nTel. +255 787 240 780 | +255 754 757 670\nEmail: info@ozmaelogistics.com",
  footerNotesMiddle: "Storage for overstayed shipment\nDemurage charges for over satyed shipment\nOffloading Charges at client premises",
  footerNotesRight: "Commercial Invoice\nPacking List\nBill of Landing Copy\nTPIN Copy",
};

interface QuotationTemplateEditorProps {
  initialData?: any; // the quotation row
  onSave?: (metadata: QuotationMetadata, totalValue: number) => Promise<void>;
  onEmail?: (metadata: QuotationMetadata) => void;
  onClose?: () => void;
  isSaving?: boolean;
  renderActions?: (meta: QuotationMetadata) => React.ReactNode;
}

// --- Sub-components (Moved outside to prevent re-rendering loss of focus) ---
const EditableInput = ({ value, onChange, className, isBold = false, printMode = false }: any) => {
  if (printMode) {
    return <div className={cn("inline-block break-words whitespace-pre-wrap", className, isBold && "font-bold")}>{value}</div>;
  }
  return (
    <input 
      type="text" 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      className={cn("bg-transparent border border-transparent hover:border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-1 w-full transition-all outline-none", className, isBold && "font-bold")}
    />
  );
};

const EditableTextarea = ({ value, onChange, className, isBold = false, printMode = false }: any) => {
  if (printMode) {
    return <div className={cn("whitespace-pre-wrap", className, isBold && "font-bold")}>{value}</div>;
  }
  return (
    <textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      rows={value.split('\n').length || 1}
      className={cn("bg-transparent border border-transparent hover:border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded p-1 w-full transition-all outline-none resize-none overflow-hidden", className, isBold && "font-bold")}
    />
  );
};

export function QuotationTemplateEditor({ initialData, onSave, onEmail, onClose, isSaving, renderActions }: QuotationTemplateEditorProps) {
  const [meta, setMeta] = useState<QuotationMetadata>(DEFAULT_METADATA);
  const [printMode, setPrintMode] = useState(false);
  
  useEffect(() => {
    if (initialData?.metadata && Object.keys(initialData.metadata).length > 0) {
      setMeta({ ...DEFAULT_METADATA, ...initialData.metadata });
    } else if (initialData) {
      // Pre-fill some data if fresh
      const newMeta = { ...DEFAULT_METADATA };
      newMeta.leftFields = newMeta.leftFields.map(f => {
        if (f.label === "Date :") return { ...f, value: new Date().toLocaleDateString() };
        if (f.label === "Customer :") return { ...f, value: initialData.customer?.company_name || initialData.customer_name_raw || "" };
        if (f.label === "Destination :") return { ...f, value: initialData.destination || "" };
        return f;
      });
      newMeta.totalAmountText = initialData.total_amount_usd?.toString() || "";
      setMeta(newMeta);
    }
  }, [initialData]);

  const updateLeftField = (index: number, val: string) => {
    const updated = [...meta.leftFields];
    updated[index].value = val;
    setMeta({ ...meta, leftFields: updated });
  };
  const updateLeftFieldLabel = (index: number, val: string) => {
    const updated = [...meta.leftFields];
    updated[index].label = val;
    setMeta({ ...meta, leftFields: updated });
  };

  const updateRow = (index: number, field: 'desc' | 'amount' | 'remarks', val: string) => {
    const updated = [...meta.tableRows];
    updated[index][field] = val;
    setMeta({ ...meta, tableRows: updated });
    
    // Auto-sum functionality could be added here if amount contains purely numbers
  };

  const addRow = () => {
    setMeta({ ...meta, tableRows: [...meta.tableRows, { type: "item", desc: "", amount: "", remarks: "" }] });
  };

  const removeRow = (index: number) => {
    const updated = [...meta.tableRows];
    updated.splice(index, 1);
    setMeta({ ...meta, tableRows: updated });
  };

  const handlePrint = async () => {
    try {
      const blob = await pdf(
        <QuotationPDFDocument 
          meta={meta} 
          logoUrl={ozmaeLogoImg} 
          signatureUrl={signatureImg} 
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Quotation_${meta.leftFields.find(f => f.label.includes('Customer'))?.value || 'Ozmae'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const handleSave = () => {
    if (onSave) {
      // attempt to parse total amount
      const totalNum = parseFloat(meta.totalAmountText.replace(/[^0-9.-]+/g,"")) || 0;
      onSave(meta, totalNum);
    }
  };

  const handleDownloadAndEmail = async () => {
    await handlePrint();
    if (onEmail) {
      onEmail(meta);
    }
  };

  const getColWidthClass = (idx: number, total: number) => {
    if (idx === 0) return "w-[48%]";
    if (idx === total - 1) return "w-[20%]";
    const remaining = 100 - 48 - 20;
    const midCount = total - 2;
    return `w-[${remaining / midCount}%]`;
  };

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

  const calculateSum = (colIdx: number, colCount: number) => {
    return meta.tableRows.reduce((acc, row) => {
      if (row.type !== 'item') return acc;
      const val = getRowValue(row, colIdx, colCount);
      return acc + cleanAmount(val);
    }, 0);
  };

  const getRowValue = (row: any, colIdx: number, totalCols: number) => {
    if (colIdx === 0) return row.desc || "";
    if (colIdx === totalCols - 1) return row.remarks || "";
    if (colIdx === 1) return row.amount || "";
    return row.extraCols ? (row.extraCols[colIdx - 2] || "") : "";
  };

  const updateRowValue = (rowIdx: number, colIdx: number, totalCols: number, val: string) => {
    const updated = [...meta.tableRows];
    const row = { ...updated[rowIdx] };
    if (colIdx === 0) row.desc = val;
    else if (colIdx === totalCols - 1) row.remarks = val;
    else if (colIdx === 1) row.amount = val;
    else {
      const extraCols = [...(row.extraCols || [])];
      extraCols[colIdx - 2] = val;
      row.extraCols = extraCols;
    }
    updated[rowIdx] = row;
    setMeta({ ...meta, tableRows: updated });
  };

  const addColumn = () => {
    const newHeaders = [...meta.tableHeaders];
    newHeaders.splice(newHeaders.length - 1, 0, "NEW COL");
    setMeta({ ...meta, tableHeaders: newHeaders });
  };

  const removeColumn = (colIdx: number) => {
    if (colIdx === 0 || colIdx === meta.tableHeaders.length - 1) return;
    
    const newHeaders = [...meta.tableHeaders];
    newHeaders.splice(colIdx, 1);
    
    const newRows = meta.tableRows.map(row => {
       const newRow = { ...row };
       if (colIdx === 1) {
           if (newRow.extraCols && newRow.extraCols.length > 0) {
               newRow.amount = newRow.extraCols[0];
               newRow.extraCols = newRow.extraCols.slice(1);
           } else {
               newRow.amount = "";
           }
       } else {
           if (newRow.extraCols) {
               const extra = [...newRow.extraCols];
               extra.splice(colIdx - 2, 1);
               newRow.extraCols = extra;
           }
       }
       return newRow;
    });

    const metaAny = meta as any;
    let newTotalText = meta.totalAmountText;
    let newExtraTotals = metaAny.extraTotalAmounts ? [...metaAny.extraTotalAmounts] : [];
    
    if (colIdx === 1) {
       if (newExtraTotals.length > 0) {
          newTotalText = newExtraTotals[0];
          newExtraTotals = newExtraTotals.slice(1);
       } else {
          newTotalText = "";
       }
    } else {
       if (newExtraTotals.length >= colIdx - 1) {
          newExtraTotals.splice(colIdx - 2, 1);
       }
    }

    setMeta({
       ...meta,
       tableHeaders: newHeaders,
       tableRows: newRows,
       totalAmountText: newTotalText,
       extraTotalAmounts: newExtraTotals
    } as any);
  };


  return (
    <div className={cn("flex flex-col h-full bg-gray-100", printMode && "bg-white")}>
      {!printMode && (
        <div className="flex-none bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10 sticky top-0">
          <div>
            <h2 className="text-lg font-bold">Quotation Editor</h2>
            <p className="text-sm text-gray-500">Edit any text block by clicking on it.</p>
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <Button variant="outline" onClick={onClose}><X className="h-4 w-4 mr-2" /> Cancel</Button>
            )}
            <Button variant="secondary" onClick={handlePrint} className="gap-2 bg-[#0a1e3f] text-white hover:bg-[#0a1e3f]/90 h-10 px-4">
              <FileText className="h-4 w-4" /> Download Professional PDF
            </Button>
            {onSave && (
              <Button onClick={handleSave} disabled={isSaving} className="bg-[#F26B2A] hover:bg-[#d85e23] gap-2 h-10 px-4">
                <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Template"}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleDownloadAndEmail}
              className="gap-2 border-[#F26B2A] text-[#F26B2A] hover:bg-[#F26B2A]/5 h-10 px-4"
            >
              <Mail className="h-4 w-4" /> Download & Send Email
            </Button>
            {renderActions && (
              <>
                <div className="w-px h-6 bg-gray-300 mx-1" />
                {renderActions(meta)}
              </>
            )}
          </div>
        </div>
      )}

      <div className={cn("flex-1 overflow-y-auto w-full", !printMode && "p-8")}>
        <div id="quotation-print-area" className={cn(
            "bg-white mx-auto relative",
            !printMode && "shadow-xl max-w-[850px] min-h-[1200px] border border-gray-200"
          )}
          style={printMode ? { width: '210mm', minHeight: '297mm', margin: 0, padding: 0 } : {}}
        >
          {/* Top Border Line */}
          <div className="h-2 w-full bg-[#0a1e3f]" />

          {/* Header Row */}
          <div className="px-12 py-8 flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-4 w-[50%]">
              <img src={ozmaeLogoImg} alt="Ozmae Freight" className="w-full max-w-[320px] h-auto object-contain object-left scale-[1.1] origin-left" />
            </div>

            {/* Header divider and Text */}
            <div className="flex items-center gap-6">
              <div className="h-28 w-1 bg-black rounded-full opacity-80" />
              <div className="flex flex-col text-[#404040]">
                <h1 className="text-2xl font-black tracking-tight uppercase">Ozmae Freight Solutions</h1>
                <p className="text-[13px]">Arusha, Tanzania East Africa</p>
                <p className="text-[13px]">info@ozmaelogistics.com</p>
                <p className="text-[13px]">www.ozmaelogistics.com</p>
                <p className="text-[13px] font-medium">+255 787 240 780 | +255 754 757 670</p>
              </div>
            </div>
          </div>

          {/* Title Bar */}
          <div className="bg-[#0a1e3f] text-white w-full py-4 px-12 text-center my-2">
            {!printMode ? (
               <input 
                 value={meta.titleText}
                 onChange={(e) => setMeta({ ...meta, titleText: e.target.value.toUpperCase() })}
                 className="bg-transparent text-white font-bold text-center w-full uppercase text-[15px] outline-none border border-transparent hover:border-white/30 focus:border-white p-1 rounded transition-all"
               />
            ) : (
               <h2 className="font-bold uppercase text-[15px] tracking-wide m-0">{meta.titleText}</h2>
            )}
          </div>

          {/* Body Content - Two Column Layout */}
          <div className="px-12 py-6 flex gap-6 relative items-start">
            
            {/* Left Column - Details Matrix */}
            <div className="w-[36%] border border-black/80 flex flex-col mt-px">
              {meta.leftFields.map((field, idx) => (
                <div key={idx} className="flex border-b border-black/80 last:border-b-0 min-h-[32px]">
                  <div className="w-[45%] border-r border-black/80 p-1.5 flex items-center bg-[#fafafa]">
                    <EditableInput value={field.label} onChange={(v: string) => updateLeftFieldLabel(idx, v)} isBold className="text-[13px]" printMode={printMode} />
                  </div>
                  <div className="w-[55%] p-1.5 flex items-center">
                     <EditableInput value={field.value} onChange={(v: string) => updateLeftField(idx, v)} className="text-[13px] text-gray-800" printMode={printMode} />
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column - Pricing Table */}
            <div className="flex-1 flex flex-col">
              <div className="border border-black/80 w-full flex flex-col">
                {/* Headers */}
                <div className="flex border-b border-black/80">
                  {meta.tableHeaders.map((header, colIdx) => (
                    <div key={colIdx} className={cn("border-r border-black/80 p-2", getColWidthClass(colIdx, meta.tableHeaders.length), colIdx === meta.tableHeaders.length - 1 && "border-r-0")}>
                      <div className="flex justify-between items-center group relative">
                        <EditableInput 
                          value={header} 
                          onChange={(v: string) => {
                            const newHeaders = [...meta.tableHeaders];
                            newHeaders[colIdx] = v;
                            setMeta({ ...meta, tableHeaders: newHeaders });
                          }} 
                          isBold 
                          className={cn("text-[13px] uppercase tracking-wide", colIdx === meta.tableHeaders.length - 1 ? "text-center" : "")} 
                          printMode={printMode}
                        />
                        {!printMode && meta.tableHeaders.length > 3 && colIdx > 0 && colIdx < meta.tableHeaders.length - 1 && (
                          <button onClick={() => removeColumn(colIdx)} className="absolute -top-1 -right-1 p-0.5 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-50 rounded bg-white shadow-sm border">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {meta.tableRows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex group relative min-h-[32px]">
                    {meta.tableHeaders.map((_, colIdx) => {
                      const isLastRow = rowIdx === meta.tableRows.length - 1;
                      const isRemarks = colIdx === meta.tableHeaders.length - 1;
                      const hideBottomBorder = isRemarks && row.mergeRemark && !isLastRow;
                      
                      return (
                        <div key={colIdx} className={cn(
                          "border-r border-black/80 p-1.5 flex flex-col justify-start relative", 
                          getColWidthClass(colIdx, meta.tableHeaders.length), 
                          isRemarks && "border-r-0", 
                          colIdx === 0 && "pl-3",
                          (!isLastRow && !hideBottomBorder) ? "border-b border-black/20" : ""
                        )}>
                          <EditableTextarea 
                            value={getRowValue(row, colIdx, meta.tableHeaders.length)}
                            onChange={(v: string) => updateRowValue(rowIdx, colIdx, meta.tableHeaders.length, v)}
                            className={cn("text-[13px] relative z-10", colIdx > 0 && !isRemarks ? "text-right pr-2" : isRemarks ? "text-center" : "")}
                            printMode={printMode}
                          />
                          
                          {/* Toggle merge button for remarks column */}
                          {!printMode && isRemarks && !isLastRow && (
                            <button 
                               onClick={() => {
                                  const updated = [...meta.tableRows];
                                  updated[rowIdx].mergeRemark = !updated[rowIdx].mergeRemark;
                                  setMeta({ ...meta, tableRows: updated });
                               }} 
                               className="absolute -bottom-[9px] left-1/2 -translate-x-1/2 p-[2px] bg-white border border-gray-300 rounded shadow-sm opacity-0 group-hover:opacity-100 z-20 text-gray-500 hover:text-blue-600 transition-opacity" 
                               title={row.mergeRemark ? "Restore divider line" : "Hide divider line (merge downward)"}
                            >
                              {row.mergeRemark ? <Unlink className="h-[10px] w-[10px]" /> : <Link2 className="h-[10px] w-[10px]" />}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {!printMode && (
                      <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={() => removeRow(rowIdx)} className="p-1 text-red-500 hover:bg-red-50 rounded bg-white border shadow-sm">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Total Row */}
                <div className="flex border-t border-black/80 bg-[#0a1e3f] text-white font-bold">
                  {meta.tableHeaders.map((_, colIdx) => {
                    if (colIdx === 0) {
                      return (
                        <div key={colIdx} className={cn("border-r border-white/20 p-2 pl-3 flex items-center font-bold", getColWidthClass(colIdx, meta.tableHeaders.length))}>
                          <span className="text-[13px] uppercase tracking-widest text-white tracking-widest font-black">TOTAL</span>
                        </div>
                      );
                    } else if (colIdx === meta.tableHeaders.length - 1) {
                      return <div key={colIdx} className={cn("p-2", getColWidthClass(colIdx, meta.tableHeaders.length))} />;
                    } else {
                      const sum = calculateSum(colIdx, meta.tableHeaders.length);
                      const totalVal = formatAmount(sum);
                      
                      return (
                        <div key={colIdx} className={cn("border-r border-white/20 p-2 flex items-center justify-end text-white font-bold", getColWidthClass(colIdx, meta.tableHeaders.length))}>
                          <span className="text-[14px] pr-2">{totalVal}</span>
                        </div>
                      );
                    }
                  })}
                </div>
              </div>

              {!printMode && (
                <div className="mt-2 text-right flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={addColumn} className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Plus className="h-3 w-3 mr-1" /> Add Column
                  </Button>
                  <Button variant="ghost" size="sm" onClick={addRow} className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Plus className="h-3 w-3 mr-1" /> Add Row
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Area */}
          <div className="px-12 pt-16 pb-12 mt-auto grid grid-cols-3 gap-8">
            <div className="text-gray-600 text-[13px] whitespace-pre-wrap flex flex-col items-start pr-4 relative">
               <EditableTextarea value={meta.footerNotesLeft} onChange={(v: string) => setMeta({ ...meta, footerNotesLeft: v })} className="min-h-[160px] leading-relaxed relative z-10" printMode={printMode} />
               <div className="absolute top-[28px] left-[0px] w-[220px] h-[70px] pointer-events-none mix-blend-multiply opacity-100 flex items-center">
                 <img src={signatureImg} alt="Signature" className="w-full h-full object-contain object-left scale-[1.3] origin-left" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
               </div>
            </div>
            
            <div className="text-gray-600 text-[13px] whitespace-pre-wrap flex flex-col px-4">
               <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0a1e3f] mb-2">NOT INCLUDED</h4>
               <EditableTextarea value={meta.footerNotesMiddle} onChange={(v: string) => setMeta({ ...meta, footerNotesMiddle: v })} isBold={false} className="min-h-[140px] font-medium" printMode={printMode} />
            </div>

            <div className="text-gray-600 text-[13px] whitespace-pre-wrap flex flex-col pl-4">
               <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#0a1e3f] mb-2">Important Documents:</h4>
               <EditableTextarea value={meta.footerNotesRight} onChange={(v: string) => setMeta({ ...meta, footerNotesRight: v })} isBold={false} className="min-h-[140px] font-medium" printMode={printMode} />
            </div>
          </div>
          
          <style>{`
            /* Print styles removed in favor of @react-pdf/renderer */
          `}</style>
        </div>
      </div>
    </div>
  );
}
