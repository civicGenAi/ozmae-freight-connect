const fs = require('fs');

let fileStr = fs.readFileSync('src/pages/Leads.tsx', 'utf8');

// 1. Add imports for StringArrayInput and useEffect
fileStr = fileStr.replace('import { useState } from "react";', 'import { useState, useEffect } from "react";');
fileStr = fileStr.replace('import { DeclineReasonModal } from "@/components/DeclineReasonModal";', 'import { DeclineReasonModal } from "@/components/DeclineReasonModal";\nimport { StringArrayInput } from "@/components/StringArrayInput";');

// 2. Add state inside Leads()
const stateBlock = `
  const [newAdditionalEmails, setNewAdditionalEmails] = useState<string[]>([]);
  const [newAdditionalPhones, setNewAdditionalPhones] = useState<string[]>([]);
  const [editAdditionalEmails, setEditAdditionalEmails] = useState<string[]>([]);
  const [editAdditionalPhones, setEditAdditionalPhones] = useState<string[]>([]);

  useEffect(() => {
    if (leadToEdit) {
      setEditAdditionalEmails(leadToEdit.additional_emails || []);
      setEditAdditionalPhones(leadToEdit.additional_phones || []);
    }
  }, [leadToEdit]);
`;
fileStr = fileStr.replace('const navigate = useNavigate();', 'const navigate = useNavigate();\n' + stateBlock);

// 3. Update handleCreateLead
const oldCreateLead = `          assigned_user:profiles!leads_assigned_to_fkey(full_name)
        \`)`;
// actually I'll just replace the formData processing.
const oldCreateData = `    const data = {
      lead_number: \`L-\${Date.now().toString().slice(-4)}\`,
      customer_name_raw: formData.get("customer_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      cargo_type: "general", 
      cargo_description: formData.get("cargo_details"),
      rate_usd: parseFloat(formData.get("rate") as string) || 0,
      status: "new",
    };`;

const newCreateData = `    const data = {
      lead_number: \`L-\${Date.now().toString().slice(-4)}\`,
      customer_name_raw: formData.get("customer_name"),
      contact_person: formData.get("contact_person"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      additional_emails: newAdditionalEmails,
      additional_phones: newAdditionalPhones,
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      commodity: formData.get("commodity"),
      validity: formData.get("validity"),
      chargeable_weight: parseFloat(formData.get("chargeable_weight") as string) || 0,
      cif_value_usd: parseFloat(formData.get("cif_value_usd") as string) || null,
      remarks: formData.get("remarks"),
      cargo_type: "general", 
      cargo_description: formData.get("cargo_details"),
      rate_usd: parseFloat(formData.get("rate") as string) || 0,
      status: "new",
    };`;
fileStr = fileStr.replace(oldCreateData, newCreateData);

// Also reset state on onSuccess for create
fileStr = fileStr.replace('setIsNewModalOpen(false);', 'setIsNewModalOpen(false);\n      setNewAdditionalEmails([]);\n      setNewAdditionalPhones([]);');

// 4. Update handleUpdateLead
const oldUpdateData = `    const data = {
      id: leadToEdit.id,
      customer_name_raw: formData.get("customer_name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      cargo_description: formData.get("cargo_details"),
      rate_usd: parseFloat(formData.get("rate") as string) || 0,
    };`;

const newUpdateData = `    const data = {
      id: leadToEdit.id,
      customer_name_raw: formData.get("customer_name"),
      contact_person: formData.get("contact_person"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      additional_emails: editAdditionalEmails,
      additional_phones: editAdditionalPhones,
      origin: formData.get("origin"),
      destination: formData.get("destination"),
      commodity: formData.get("commodity"),
      validity: formData.get("validity"),
      chargeable_weight: parseFloat(formData.get("chargeable_weight") as string) || null,
      cif_value_usd: parseFloat(formData.get("cif_value_usd") as string) || null,
      remarks: formData.get("remarks"),
      cargo_description: formData.get("cargo_details"),
      rate_usd: parseFloat(formData.get("rate") as string) || 0,
    };`;
fileStr = fileStr.replace(oldUpdateData, newUpdateData);

fs.writeFileSync('src/pages/Leads.tsx', fileStr);
console.log("Patched JS Logic for Leads");
