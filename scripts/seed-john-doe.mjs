const BASE = process.env.BASE_URL || "http://localhost:3000";

async function post(action) {
  const response = await fetch(`${BASE}/api/user-data`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return payload;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function invoice(id, client, status, total, daysBack, dueInDays, items, extra = {}) {
  return {
    id,
    client,
    avatar: "",
    date: daysAgo(daysBack),
    dueDate: daysFromNow(dueInDays),
    amount: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    subtotal: total,
    total,
    currency: "USD",
    items,
    status,
    workflowStatus: status === "Paid" ? "Delivered" : status === "Overdue" ? "Sent" : "Sent",
    statusColor: "",
    clientColor: "bg-foreground/10",
    email: extra.email || `${client.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    phone: extra.phone || "+1 (555) 010-2000",
    company: extra.company,
    amountPaid: status === "Paid" ? total : extra.amountPaid ?? 0,
    paidAt: status === "Paid" ? daysAgo(Math.max(daysBack - 2, 0)) : undefined,
    paymentMethod: status === "Paid" ? "Bank transfer" : undefined,
    clientId: extra.clientId,
  };
}

async function main() {
  console.log("Resetting local profiles...");
  try {
    await post({ action: "deleteAllProfiles" });
  } catch {
    // First run — no profiles yet.
  }

  console.log("Creating John Doe profile...");
  const snapshot = await post({
    action: "createProfile",
    profile: {
      name: "John Doe",
      profession: "Freelance Designer",
      email: "john@billcraft.studio",
      phone: "+1 (555) 987-6543",
      businessName: "BillCraft Studio",
      taxId: "12-3456789",
      website: "https://billcraft.studio",
      defaultDeliveryLink: "https://drive.google.com/drive/folders/demo",
      password: "111111",
      passwordHint: "Six ones",
    },
  });

  const profileId = snapshot.activeProfile?.id || snapshot.profiles?.[0]?.id;
  if (!profileId) {
    throw new Error("Could not resolve profile id after creation.");
  }

  console.log(`Seeding profile ${profileId}...`);

  const clients = [
    { id: "client-acme", name: "Sarah Chen", email: "sarah@acmecorp.com", phone: "+1 (555) 201-4400", company: "Acme Corp", address: "1200 Market St, San Francisco, CA" },
    { id: "client-northwind", name: "Marcus Webb", email: "marcus@northwind.io", phone: "+1 (555) 302-8811", company: "Northwind Labs", address: "88 Harbor Ave, Seattle, WA" },
    { id: "client-lumen", name: "Elena Rossi", email: "elena@lumen.design", phone: "+1 (555) 410-9920", company: "Lumen Design Co.", address: "45 Prince St, New York, NY" },
    { id: "client-vertex", name: "James Okonkwo", email: "james@vertex.ai", phone: "+1 (555) 518-3300", company: "Vertex AI", address: "500 Innovation Dr, Austin, TX" },
  ];

  for (const client of clients) {
    await post({ action: "saveClient", profileId, originalClientId: null, client });
  }

  const catalog = [
    { id: "cat-brand", name: "Brand Identity Package", description: "Logo, palette, and typography system", defaultPrice: 2800, unit: "flat" },
    { id: "cat-ui", name: "UI Design", description: "Product screens and design system components", defaultPrice: 125, unit: "hour" },
    { id: "cat-web", name: "Website Design", description: "Marketing site layout and responsive pages", defaultPrice: 950, unit: "day" },
    { id: "cat-retainer", name: "Monthly Retainer", description: "Ongoing design support and revisions", defaultPrice: 1800, unit: "flat" },
  ];

  for (const item of catalog) {
    await post({ action: "saveCatalogItem", profileId, item });
  }

  const invoices = [
    invoice("INV-1042", "Sarah Chen", "Paid", 4200, 32, -14, [
      { id: "li-1", description: "Brand identity refresh", quantity: 1, price: 2800 },
      { id: "li-2", description: "UI design — 11 hours", quantity: 11, price: 125 },
    ], { clientId: "client-acme", company: "Acme Corp", email: "sarah@acmecorp.com" }),
    invoice("INV-1043", "Marcus Webb", "Unpaid", 3150, 8, 18, [
      { id: "li-3", description: "Website design — 3 days", quantity: 3, price: 950 },
      { id: "li-4", description: "Launch landing page", quantity: 1, price: 300 },
    ], { clientId: "client-northwind", company: "Northwind Labs", email: "marcus@northwind.io" }),
    invoice("INV-1044", "Elena Rossi", "Overdue", 1800, 18, -9, [
      { id: "li-5", description: "Monthly retainer — March", quantity: 1, price: 1800 },
    ], { clientId: "client-lumen", company: "Lumen Design Co.", email: "elena@lumen.design" }),
    invoice("INV-1045", "James Okonkwo", "Paid", 5625, 4, -3, [
      { id: "li-6", description: "Product UI design — 35 hours", quantity: 35, price: 125 },
      { id: "li-7", description: "Design QA and handoff", quantity: 1, price: 1250 },
    ], { clientId: "client-vertex", company: "Vertex AI", email: "james@vertex.ai" }),
    invoice("INV-1046", "Sarah Chen", "Unpaid", 1375, 1, 24, [
      { id: "li-8", description: "Dashboard component library", quantity: 11, price: 125 },
    ], { clientId: "client-acme", company: "Acme Corp", email: "sarah@acmecorp.com", amountPaid: 500 }),
    invoice("INV-1047", "Marcus Webb", "Overdue", 950, 12, -5, [
      { id: "li-9", description: "Website design — 1 day", quantity: 1, price: 950 },
    ], { clientId: "client-northwind", company: "Northwind Labs", email: "marcus@northwind.io" }),
  ];

  for (const inv of invoices) {
    await post({ action: "saveInvoice", profileId, invoice: inv });
  }

  const expenses = [
    { id: "exp-1", description: "Annual Figma subscription", amount: 180, category: "Software", date: daysAgo(4), merchant: "Figma", isTaxDeductible: true },
    { id: "exp-2", description: "Client kickoff lunch", amount: 86.5, category: "Meals", date: daysAgo(9), merchant: "Cafe Nero", isTaxDeductible: true },
    { id: "exp-3", description: "Flight to client workshop", amount: 412, category: "Travel", date: daysAgo(16), merchant: "Delta Air Lines", isTaxDeductible: true },
    { id: "exp-4", description: "Printer paper and notebooks", amount: 47.2, category: "Office Supplies", date: daysAgo(21), merchant: "Staples", isTaxDeductible: true },
    { id: "exp-5", description: "Portfolio domain renewal", amount: 18, category: "Marketing", date: daysAgo(2), merchant: "Namecheap", isTaxDeductible: true },
  ];

  for (const expense of expenses) {
    await post({ action: "saveExpense", profileId, expense });
  }

  const vendors = [
    { id: "vendor-pixel", name: "Pixel Forge LLC", email: "billing@pixelforge.dev", phone: "+1 (555) 701-2200", company: "Pixel Forge LLC" },
    { id: "vendor-copy", name: "CopyLab Agency", email: "accounts@copylab.co", phone: "+1 (555) 802-1188", company: "CopyLab Agency" },
  ];

  for (const vendor of vendors) {
    await post({ action: "saveVendor", profileId, originalVendorId: null, vendor });
  }

  const payables = [
    {
      id: "PAY-301",
      vendor: "Pixel Forge LLC",
      vendorId: "vendor-pixel",
      avatar: "",
      date: daysAgo(10),
      dueDate: daysFromNow(5),
      amount: "$1,200.00",
      subtotal: 1200,
      total: 1200,
      currency: "USD",
      items: [{ id: "pli-1", description: "Illustration pack for Acme launch", quantity: 1, price: 1200 }],
      status: "Unpaid",
      workflowStatus: "Sent",
      statusColor: "",
      vendorColor: "bg-foreground/10",
      email: "billing@pixelforge.dev",
      phone: "+1 (555) 701-2200",
      company: "Pixel Forge LLC",
    },
    {
      id: "PAY-302",
      vendor: "CopyLab Agency",
      vendorId: "vendor-copy",
      avatar: "",
      date: daysAgo(22),
      dueDate: daysFromNow(-2),
      amount: "$640.00",
      subtotal: 640,
      total: 640,
      currency: "USD",
      items: [{ id: "pli-2", description: "Website copywriting", quantity: 1, price: 640 }],
      status: "Overdue",
      workflowStatus: "Sent",
      statusColor: "",
      vendorColor: "bg-foreground/10",
      email: "accounts@copylab.co",
      phone: "+1 (555) 802-1188",
      company: "CopyLab Agency",
    },
  ];

  for (const payable of payables) {
    await post({ action: "saveOutsourcingInvoice", profileId, invoice: payable });
  }

  const tasks = [
    { id: "task-1", title: "Acme dashboard wireframes", description: "Low-fi flows for analytics views", client: "Sarah Chen", clientId: "client-acme", stage: "in-progress", priority: "High", tags: ["design", "ui"], order: 0, estimate: "6h", dueDate: daysFromNow(4) },
    { id: "task-2", title: "Northwind homepage revisions", description: "Hero and pricing section updates", client: "Marcus Webb", clientId: "client-northwind", stage: "review", priority: "Medium", tags: ["web"], order: 0, estimate: "4h", dueDate: daysFromNow(2) },
    { id: "task-3", title: "Vertex onboarding screens", description: "Ship final UI for signup flow", client: "James Okonkwo", clientId: "client-vertex", stage: "done", priority: "High", tags: ["product"], order: 0, estimate: "12h", dueDate: daysAgo(1) },
    { id: "task-4", title: "Lumen brand guidelines PDF", description: "Export and package deliverables", client: "Elena Rossi", clientId: "client-lumen", stage: "done", priority: "Medium", tags: ["brand"], order: 1, estimate: "3h", dueDate: daysAgo(3) },
    { id: "task-5", title: "Update portfolio case studies", description: "Add Q1 client work", stage: "backlog", priority: "Low", tags: ["marketing"], order: 0, estimate: "5h", dueDate: daysFromNow(14) },
    { id: "task-6", title: "Invoice follow-up for Lumen", description: "Send reminder for overdue retainer", client: "Elena Rossi", clientId: "client-lumen", stage: "backlog", priority: "High", tags: ["admin"], order: 1, estimate: "30m", dueDate: daysFromNow(1) },
  ];

  await post({ action: "saveTodoTasks", profileId, tasks });

  console.log("Done.");
  console.log(JSON.stringify({ profileId, clients: clients.length, invoices: invoices.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
