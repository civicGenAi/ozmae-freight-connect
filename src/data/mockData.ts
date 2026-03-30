// ---- CUSTOMERS ----
export const customers = [
  "Karibu Exports Ltd",
  "Simba Commodities",
  "East Coast Trading",
  "Zanzibar Spice Co",
  "Kilimanjaro Farms",
  "Mwanza Fish Co",
  "Dodoma Grain Supplies",
  "Arusha Coffee Growers",
];

export const cities = ["Dar es Salaam", "Arusha", "Nairobi", "Mombasa", "Kampala", "Kigali"];

// ---- DRIVERS ----
export const drivers = [
  { id: "DRV-001", name: "Joseph Mwangi", phone: "+255 712 345 678", licenseClass: "C+E", status: "On Duty" as const, assignedVehicle: "T 123 ABC" },
  { id: "DRV-002", name: "Hassan Juma", phone: "+255 713 456 789", licenseClass: "C", status: "Available" as const, assignedVehicle: "T 456 DEF" },
  { id: "DRV-003", name: "Peter Kimaro", phone: "+255 714 567 890", licenseClass: "C+E", status: "On Duty" as const, assignedVehicle: "T 789 GHI" },
  { id: "DRV-004", name: "Emmanuel Shirima", phone: "+255 715 678 901", licenseClass: "C", status: "Available" as const, assignedVehicle: null },
  { id: "DRV-005", name: "Francis Mushi", phone: "+255 716 789 012", licenseClass: "B", status: "Off" as const, assignedVehicle: null },
  { id: "DRV-006", name: "David Makundi", phone: "+255 717 890 123", licenseClass: "C+E", status: "On Duty" as const, assignedVehicle: "T 321 JKL" },
  { id: "DRV-007", name: "Charles Mollel", phone: "+255 718 901 234", licenseClass: "C", status: "Available" as const, assignedVehicle: null },
  { id: "DRV-008", name: "Abel Tarimo", phone: "+255 719 012 345", licenseClass: "C+E", status: "On Duty" as const, assignedVehicle: "T 654 MNO" },
];

// ---- VEHICLES ----
export const vehicles = [
  { plate: "T 123 ABC", type: "Truck", capacity: "30 tons", status: "On Job" as const, currentJob: "JOB-0024" },
  { plate: "T 456 DEF", type: "Van", capacity: "5 tons", status: "Available" as const, currentJob: null },
  { plate: "T 789 GHI", type: "Flatbed Trailer", capacity: "25 tons", status: "On Job" as const, currentJob: "JOB-0026" },
  { plate: "T 321 JKL", type: "Truck", capacity: "20 tons", status: "On Job" as const, currentJob: "JOB-0028" },
  { plate: "T 654 MNO", type: "Truck", capacity: "15 tons", status: "On Job" as const, currentJob: "JOB-0030" },
  { plate: "T 987 PQR", type: "Van", capacity: "3 tons", status: "Maintenance" as const, currentJob: null },
];

// ---- LEADS ----
export const leads = [
  { id: "INQ-001", customer: "Karibu Exports Ltd", origin: "Dar es Salaam", destination: "Nairobi", cargo: "Electronics", dateReceived: "15 Mar 2026", assignedTo: "Sarah M.", status: "New" as const },
  { id: "INQ-002", customer: "Simba Commodities", origin: "Mombasa", destination: "Kampala", cargo: "Agricultural Products", dateReceived: "14 Mar 2026", assignedTo: "James K.", status: "Quoted" as const },
  { id: "INQ-003", customer: "East Coast Trading", origin: "Dar es Salaam", destination: "Kigali", cargo: "Textiles", dateReceived: "13 Mar 2026", assignedTo: "Sarah M.", status: "Converted" as const },
  { id: "INQ-004", customer: "Zanzibar Spice Co", origin: "Dar es Salaam", destination: "Arusha", cargo: "Spices", dateReceived: "12 Mar 2026", assignedTo: "James K.", status: "New" as const },
  { id: "INQ-005", customer: "Kilimanjaro Farms", origin: "Arusha", destination: "Mombasa", cargo: "Fresh Produce", dateReceived: "11 Mar 2026", assignedTo: "Sarah M.", status: "Declined" as const },
  { id: "INQ-006", customer: "Mwanza Fish Co", origin: "Dar es Salaam", destination: "Nairobi", cargo: "Frozen Fish", dateReceived: "10 Mar 2026", assignedTo: "James K.", status: "Quoted" as const },
  { id: "INQ-007", customer: "Dodoma Grain Supplies", origin: "Dodoma", destination: "Dar es Salaam", cargo: "Grain", dateReceived: "09 Mar 2026", assignedTo: "Sarah M.", status: "New" as const },
  { id: "INQ-008", customer: "Arusha Coffee Growers", origin: "Arusha", destination: "Mombasa", cargo: "Coffee Beans", dateReceived: "08 Mar 2026", assignedTo: "James K.", status: "Converted" as const },
];

// ---- QUOTATIONS ----
export const quotations = [
  { id: "QT-0041", customer: "Karibu Exports Ltd", route: "Dar es Salaam → Nairobi", cargo: "Electronics (5 tons)", amount: 4500, validUntil: "30 Mar 2026", status: "Draft" as const },
  { id: "QT-0042", customer: "Simba Commodities", route: "Mombasa → Kampala", cargo: "Agricultural Products (12 tons)", amount: 7800, validUntil: "28 Mar 2026", status: "Sent" as const },
  { id: "QT-0043", customer: "East Coast Trading", route: "Dar es Salaam → Kigali", cargo: "Textiles (8 tons)", amount: 6200, validUntil: "25 Mar 2026", status: "Accepted" as const },
  { id: "QT-0044", customer: "Zanzibar Spice Co", route: "Dar es Salaam → Arusha", cargo: "Spices (3 tons)", amount: 1800, validUntil: "22 Mar 2026", status: "Declined" as const },
  { id: "QT-0045", customer: "Kilimanjaro Farms", route: "Arusha → Mombasa", cargo: "Fresh Produce (10 tons)", amount: 5500, validUntil: "15 Mar 2026", status: "Expired" as const },
  { id: "QT-0046", customer: "Mwanza Fish Co", route: "Dar es Salaam → Nairobi", cargo: "Frozen Fish (6 tons)", amount: 5200, validUntil: "01 Apr 2026", status: "Sent" as const },
];

// ---- RATE CARD ----
export const rateCard = [
  { route: "Dar es Salaam → Nairobi", vehicleType: "Truck (30t)", baseRate: 3500, perKmRate: 1.80, minCargo: "5 tons", notes: "Border crossing fees included" },
  { route: "Dar es Salaam → Mombasa", vehicleType: "Truck (20t)", baseRate: 2800, perKmRate: 1.60, minCargo: "3 tons", notes: "Port clearance extra" },
  { route: "Dar es Salaam → Kampala", vehicleType: "Truck (30t)", baseRate: 5200, perKmRate: 2.00, minCargo: "8 tons", notes: "Multi-border surcharge applies" },
  { route: "Dar es Salaam → Kigali", vehicleType: "Truck (25t)", baseRate: 5800, perKmRate: 2.20, minCargo: "5 tons", notes: "Via Dodoma corridor" },
  { route: "Dar es Salaam → Arusha", vehicleType: "Van (5t)", baseRate: 1200, perKmRate: 1.20, minCargo: "1 ton", notes: "Same-day possible" },
  { route: "Mombasa → Nairobi", vehicleType: "Truck (20t)", baseRate: 1800, perKmRate: 1.40, minCargo: "3 tons", notes: "Highway route" },
  { route: "Mombasa → Kampala", vehicleType: "Truck (30t)", baseRate: 4500, perKmRate: 1.90, minCargo: "8 tons", notes: "Kenya transit fees included" },
  { route: "Arusha → Nairobi", vehicleType: "Van (5t)", baseRate: 900, perKmRate: 1.10, minCargo: "1 ton", notes: "Cross-border, same day" },
  { route: "Nairobi → Kampala", vehicleType: "Truck (25t)", baseRate: 3800, perKmRate: 1.70, minCargo: "5 tons", notes: "Standard route" },
  { route: "Kampala → Kigali", vehicleType: "Truck (20t)", baseRate: 2200, perKmRate: 1.50, minCargo: "3 tons", notes: "Mountain route, slower" },
];

// ---- JOB ORDERS ----
export const jobOrders = [
  { id: "JOB-0024", customer: "Karibu Exports Ltd", origin: "Dar es Salaam", destination: "Nairobi", driver: "Joseph Mwangi", vehicle: "T 123 ABC", cargo: "Electronics (5t)", status: "In Transit" as const, paymentStatus: "Deposit Paid" as const, value: 4500 },
  { id: "JOB-0025", customer: "Simba Commodities", origin: "Mombasa", destination: "Kampala", driver: "Hassan Juma", vehicle: "T 456 DEF", cargo: "Agri Products (12t)", status: "Planning" as const, paymentStatus: "Awaiting Deposit" as const, value: 7800 },
  { id: "JOB-0026", customer: "East Coast Trading", origin: "Dar es Salaam", destination: "Kigali", driver: "Peter Kimaro", vehicle: "T 789 GHI", cargo: "Textiles (8t)", status: "Dispatched" as const, paymentStatus: "Deposit Paid" as const, value: 6200 },
  { id: "JOB-0027", customer: "Zanzibar Spice Co", origin: "Dar es Salaam", destination: "Arusha", driver: "Emmanuel Shirima", vehicle: "T 456 DEF", cargo: "Spices (3t)", status: "Delivered" as const, paymentStatus: "Fully Paid" as const, value: 1800 },
  { id: "JOB-0028", customer: "Kilimanjaro Farms", origin: "Arusha", destination: "Mombasa", driver: "David Makundi", vehicle: "T 321 JKL", cargo: "Fresh Produce (10t)", status: "In Transit" as const, paymentStatus: "Deposit Paid" as const, value: 5500 },
  { id: "JOB-0029", customer: "Mwanza Fish Co", origin: "Dar es Salaam", destination: "Nairobi", driver: "Charles Mollel", vehicle: "T 654 MNO", cargo: "Frozen Fish (6t)", status: "At Destination" as const, paymentStatus: "Deposit Paid" as const, value: 5200 },
  { id: "JOB-0030", customer: "Dodoma Grain Supplies", origin: "Dodoma", destination: "Dar es Salaam", driver: "Abel Tarimo", vehicle: "T 654 MNO", cargo: "Grain (15t)", status: "In Transit" as const, paymentStatus: "Deposit Paid" as const, value: 3200 },
  { id: "JOB-0031", customer: "Arusha Coffee Growers", origin: "Arusha", destination: "Mombasa", driver: "Joseph Mwangi", vehicle: "T 123 ABC", cargo: "Coffee (8t)", status: "Delivered" as const, paymentStatus: "Fully Paid" as const, value: 4800 },
  { id: "JOB-0032", customer: "Karibu Exports Ltd", origin: "Nairobi", destination: "Kampala", driver: "Peter Kimaro", vehicle: "T 789 GHI", cargo: "Machinery (20t)", status: "Planning" as const, paymentStatus: "Awaiting Deposit" as const, value: 8500 },
  { id: "JOB-0033", customer: "Simba Commodities", origin: "Dar es Salaam", destination: "Mombasa", driver: "Hassan Juma", vehicle: "T 456 DEF", cargo: "Cement (25t)", status: "Dispatched" as const, paymentStatus: "Deposit Paid" as const, value: 3600 },
];

// ---- INVOICES ----
export const invoices = [
  { id: "INV-0081", jobId: "JOB-0024", customer: "Karibu Exports Ltd", total: 4500, deposit: 2700, balance: 1800, depositStatus: "Paid" as const, balanceStatus: "Pending" as const, dueDate: "30 Mar 2026" },
  { id: "INV-0082", jobId: "JOB-0026", customer: "East Coast Trading", total: 6200, deposit: 3720, balance: 2480, depositStatus: "Paid" as const, balanceStatus: "Pending" as const, dueDate: "28 Mar 2026" },
  { id: "INV-0083", jobId: "JOB-0027", customer: "Zanzibar Spice Co", total: 1800, deposit: 1080, balance: 720, depositStatus: "Paid" as const, balanceStatus: "Paid" as const, dueDate: "15 Mar 2026" },
  { id: "INV-0084", jobId: "JOB-0028", customer: "Kilimanjaro Farms", total: 5500, deposit: 3300, balance: 2200, depositStatus: "Paid" as const, balanceStatus: "Pending" as const, dueDate: "01 Apr 2026" },
  { id: "INV-0085", jobId: "JOB-0029", customer: "Mwanza Fish Co", total: 5200, deposit: 3120, balance: 2080, depositStatus: "Paid" as const, balanceStatus: "Overdue" as const, dueDate: "20 Mar 2026" },
  { id: "INV-0086", jobId: "JOB-0031", customer: "Arusha Coffee Growers", total: 4800, deposit: 2880, balance: 1920, depositStatus: "Paid" as const, balanceStatus: "Paid" as const, dueDate: "10 Mar 2026" },
  { id: "INV-0087", jobId: "JOB-0030", customer: "Dodoma Grain Supplies", total: 3200, deposit: 1920, balance: 1280, depositStatus: "Pending" as const, balanceStatus: "Pending" as const, dueDate: "05 Apr 2026" },
  { id: "INV-0088", jobId: "JOB-0033", customer: "Simba Commodities", total: 3600, deposit: 2160, balance: 1440, depositStatus: "Paid" as const, balanceStatus: "Pending" as const, dueDate: "02 Apr 2026" },
];

// ---- PAYMENTS ----
export const payments = [
  { id: "PAY-001", invoiceId: "INV-0081", customer: "Karibu Exports Ltd", type: "Deposit" as const, amount: 2700, method: "Bank Transfer", date: "10 Mar 2026", recordedBy: "Finance Team", status: "Confirmed" as const },
  { id: "PAY-002", invoiceId: "INV-0082", customer: "East Coast Trading", type: "Deposit" as const, amount: 3720, method: "Bank Transfer", date: "12 Mar 2026", recordedBy: "Finance Team", status: "Confirmed" as const },
  { id: "PAY-003", invoiceId: "INV-0083", customer: "Zanzibar Spice Co", type: "Deposit" as const, amount: 1080, method: "Mobile Money", date: "05 Mar 2026", recordedBy: "Sarah M.", status: "Confirmed" as const },
  { id: "PAY-004", invoiceId: "INV-0083", customer: "Zanzibar Spice Co", type: "Balance" as const, amount: 720, method: "Mobile Money", date: "16 Mar 2026", recordedBy: "Sarah M.", status: "Confirmed" as const },
  { id: "PAY-005", invoiceId: "INV-0084", customer: "Kilimanjaro Farms", type: "Deposit" as const, amount: 3300, method: "Bank Transfer", date: "15 Mar 2026", recordedBy: "Finance Team", status: "Confirmed" as const },
  { id: "PAY-006", invoiceId: "INV-0085", customer: "Mwanza Fish Co", type: "Deposit" as const, amount: 3120, method: "Cash", date: "08 Mar 2026", recordedBy: "James K.", status: "Confirmed" as const },
  { id: "PAY-007", invoiceId: "INV-0086", customer: "Arusha Coffee Growers", type: "Deposit" as const, amount: 2880, method: "Bank Transfer", date: "01 Mar 2026", recordedBy: "Finance Team", status: "Confirmed" as const },
  { id: "PAY-008", invoiceId: "INV-0086", customer: "Arusha Coffee Growers", type: "Balance" as const, amount: 1920, method: "Bank Transfer", date: "11 Mar 2026", recordedBy: "Finance Team", status: "Confirmed" as const },
];

// ---- DOCUMENTS ----
export const documentVault = [
  { jobId: "JOB-0024", customer: "Karibu Exports Ltd", route: "Dar es Salaam → Nairobi", docs: { quotation: true, invoice: true, pickup: true, delivery: false }, lastUpdated: "18 Mar 2026" },
  { jobId: "JOB-0026", customer: "East Coast Trading", route: "Dar es Salaam → Kigali", docs: { quotation: true, invoice: true, pickup: false, delivery: false }, lastUpdated: "16 Mar 2026" },
  { jobId: "JOB-0027", customer: "Zanzibar Spice Co", route: "Dar es Salaam → Arusha", docs: { quotation: true, invoice: true, pickup: true, delivery: true }, lastUpdated: "20 Mar 2026" },
  { jobId: "JOB-0028", customer: "Kilimanjaro Farms", route: "Arusha → Mombasa", docs: { quotation: true, invoice: true, pickup: true, delivery: false }, lastUpdated: "19 Mar 2026" },
  { jobId: "JOB-0031", customer: "Arusha Coffee Growers", route: "Arusha → Mombasa", docs: { quotation: true, invoice: true, pickup: true, delivery: true }, lastUpdated: "22 Mar 2026" },
];

// ---- TRACKING JOBS ----
export const trackingJobs = [
  {
    id: "JOB-0024", customer: "Karibu Exports Ltd", route: "Dar es Salaam → Nairobi",
    currentStep: 4,
    steps: ["Job Created", "Deposit Confirmed", "Dispatched", "Picked Up", "In Transit", "At Destination", "Delivered", "Closed"],
  },
  {
    id: "JOB-0026", customer: "East Coast Trading", route: "Dar es Salaam → Kigali",
    currentStep: 2,
    steps: ["Job Created", "Deposit Confirmed", "Dispatched", "Picked Up", "In Transit", "At Destination", "Delivered", "Closed"],
  },
  {
    id: "JOB-0029", customer: "Mwanza Fish Co", route: "Dar es Salaam → Nairobi",
    currentStep: 5,
    steps: ["Job Created", "Deposit Confirmed", "Dispatched", "Picked Up", "In Transit", "At Destination", "Delivered", "Closed"],
  },
];

export const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
