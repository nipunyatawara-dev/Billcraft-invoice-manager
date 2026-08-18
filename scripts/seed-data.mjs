import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import util from "util";

const scryptAsync = util.promisify(crypto.scrypt);
const PASSWORD_HASH_LENGTH = 64;

const USER_DATA_DIR = path.join(process.cwd(), "User data");

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

function createAvatar(name) {
  const initials = (name || "Client")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "C";
  const palette = ["#d1d4f9", "#f0e7d5", "#c0aede", "#d6f3e5", "#f7d8ce"];
  const index = [...(name || "Client")].reduce((sum, character) => sum + character.charCodeAt(0), 0) % palette.length;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="18" fill="${palette[index]}"/><text x="48" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="700" fill="#212842">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getStatusColor(status) {
  const styles = {
    Paid: "bg-positive/15 text-positive",
    Unpaid: "bg-foreground/[0.06] text-foreground/60",
    Overdue: "bg-accent/15 text-accent",
  };
  return styles[status] || "bg-foreground/[0.06] text-foreground/60";
}

async function createProfileSecurity(password, passwordHint) {
  const passwordSalt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, passwordSalt, PASSWORD_HASH_LENGTH);
  const passwordHash = derivedKey.toString("hex");
  return {
    passwordSalt,
    passwordHash,
    passwordHint: passwordHint || undefined,
    passwordChangedAt: new Date().toISOString(),
  };
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function main() {
  const now = new Date().toISOString();
  const profileId = "sarah-jenkins";

  console.log(`Setting up profile directory in: ${USER_DATA_DIR}...`);
  await fs.mkdir(USER_DATA_DIR, { recursive: true });
  const profileDir = path.join(USER_DATA_DIR, profileId);
  const assetDir = path.join(profileDir, "assets");
  await fs.mkdir(assetDir, { recursive: true });

  // 1. Profile Definition
  const profilePassword = "password123";
  const passwordHint = "Default studio password (password123)";
  const security = await createProfileSecurity(profilePassword, passwordHint);

  const profile = {
    id: profileId,
    name: "Sarah Jenkins",
    profession: "Senior UI/UX & Brand Consultant",
    email: "sarah.jenkins@billcraft.studio",
    phone: "+1 (555) 432-8901",
    businessName: "Jenkins Creative Studio",
    taxId: "84-2948102",
    website: "https://jenkinscreative.design",
    defaultDeliveryLink: "https://drive.google.com/drive/folders/jenkins-client-deliverables",
    createdAt: now,
    updatedAt: now,
  };

  const profileIndexEntry = {
    ...profile,
    hasPassword: true,
    passwordHint: security.passwordHint,
    passwordChangedAt: security.passwordChangedAt,
  };

  // Read existing profiles if any, replace or prepend
  let existingProfiles = [];
  try {
    const rawIndex = await fs.readFile(path.join(USER_DATA_DIR, "profiles.json"), "utf8");
    const parsed = JSON.parse(rawIndex);
    if (Array.isArray(parsed.profiles)) {
      existingProfiles = parsed.profiles.filter((p) => p.id !== profileId);
    }
  } catch {
    // Fresh setup
  }

  const profiles = [profileIndexEntry, ...existingProfiles];

  // 2. Clients (5)
  const clients = [
    {
      id: "client-acme",
      name: "Sarah Chen",
      email: "sarah@acmecorp.com",
      phone: "+1 (555) 201-4400",
      whatsapp: "+15552014400",
      avatar: createAvatar("Sarah Chen"),
      company: "Acme Corporation",
      address: "1200 Market St, Suite 400, San Francisco, CA 94102",
      deliveryLink: "https://drive.google.com/drive/folders/acme-corp",
      notes: "Key enterprise account. Prefers net-30 terms.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "client-northwind",
      name: "Marcus Webb",
      email: "marcus@northwind.io",
      phone: "+1 (555) 302-8811",
      whatsapp: "+15553028811",
      avatar: createAvatar("Marcus Webb"),
      company: "Northwind Labs",
      address: "88 Harbor Ave, Seattle, WA 98101",
      deliveryLink: "https://drive.google.com/drive/folders/northwind",
      notes: "FinTech SaaS startup. Fast approval cycle.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "client-lumen",
      name: "Elena Rossi",
      email: "elena@lumen.design",
      phone: "+1 (555) 410-9920",
      whatsapp: "+15554109920",
      avatar: createAvatar("Elena Rossi"),
      company: "Lumen Design Co.",
      address: "45 Prince St, New York, NY 10012",
      deliveryLink: "https://drive.google.com/drive/folders/lumen",
      notes: "High-end luxury retail client.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "client-vertex",
      name: "James Okonkwo",
      email: "james@vertex.ai",
      phone: "+1 (555) 518-3300",
      whatsapp: "+15555183300",
      avatar: createAvatar("James Okonkwo"),
      company: "Vertex AI",
      address: "500 Innovation Dr, Austin, TX 78701",
      deliveryLink: "https://drive.google.com/drive/folders/vertex",
      notes: "AI platform product redesign work.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "client-horizon",
      name: "Chloe Zhao",
      email: "chloe@horizonhealth.co",
      phone: "+1 (555) 629-7712",
      whatsapp: "+15556297712",
      avatar: createAvatar("Chloe Zhao"),
      company: "Horizon Health",
      address: "210 Commonwealth Ave, Boston, MA 02116",
      deliveryLink: "https://drive.google.com/drive/folders/horizon",
      notes: "Digital healthcare platform & patient portal.",
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 3. Invoices (5)
  const invoices = [
    {
      id: "INV-2024-001",
      clientId: "client-acme",
      client: "Sarah Chen",
      avatar: createAvatar("Sarah Chen"),
      date: daysAgo(32),
      dueDate: daysAgo(2),
      amount: "$4,500.00",
      subtotal: 4500,
      total: 4500,
      currency: "USD",
      templateId: "classic",
      templateName: "Classic Invoice",
      items: [
        { id: "inv-item-1", description: "Brand Identity System & Comprehensive Style Guide", quantity: 1, price: 2500 },
        { id: "inv-item-2", description: "Executive Pitch Deck & Marketing Collateral", quantity: 1, price: 2000 },
      ],
      amountPaid: 4500,
      paidAt: daysAgo(12),
      paymentMethod: "Bank Transfer",
      paymentNotes: "Settled in full via corporate wire transfer",
      receiptAttachments: [],
      payments: [
        {
          id: "pay-rec-1",
          amount: 4500,
          paidAt: daysAgo(12),
          method: "Bank Transfer",
          notes: "Wire Ref #ACME-89021",
          receiptAttachments: [],
        },
      ],
      status: "Paid",
      workflowStatus: "Delivered",
      statusColor: getStatusColor("Paid"),
      clientColor: "bg-foreground/10",
      email: "sarah@acmecorp.com",
      phone: "+1 (555) 201-4400",
      company: "Acme Corporation",
      address: "1200 Market St, Suite 400, San Francisco, CA 94102",
      deliveryLink: "https://drive.google.com/drive/folders/acme-corp",
      createdAt: daysAgo(32),
      updatedAt: now,
    },
    {
      id: "INV-2024-002",
      clientId: "client-northwind",
      client: "Marcus Webb",
      avatar: createAvatar("Marcus Webb"),
      date: daysAgo(10),
      dueDate: daysFromNow(14),
      amount: "$3,750.00",
      subtotal: 3750,
      total: 3750,
      currency: "USD",
      templateId: "classic",
      templateName: "Classic Invoice",
      items: [
        { id: "inv-item-3", description: "FinTech SaaS Web Application UI Redesign", quantity: 25, price: 125 },
        { id: "inv-item-4", description: "Design System Component Audit & Cleanup", quantity: 1, price: 625 },
      ],
      amountPaid: 1250,
      paidAt: daysAgo(2),
      paymentMethod: "Stripe",
      paymentNotes: "33% initial deposit received",
      receiptAttachments: [],
      payments: [
        {
          id: "pay-rec-2",
          amount: 1250,
          paidAt: daysAgo(2),
          method: "Stripe",
          notes: "Credit card deposit payment",
          receiptAttachments: [],
        },
      ],
      status: "Unpaid",
      workflowStatus: "Work Confirmed",
      statusColor: getStatusColor("Unpaid"),
      clientColor: "bg-foreground/10",
      email: "marcus@northwind.io",
      phone: "+1 (555) 302-8811",
      company: "Northwind Labs",
      address: "88 Harbor Ave, Seattle, WA 98101",
      deliveryLink: "https://drive.google.com/drive/folders/northwind",
      createdAt: daysAgo(10),
      updatedAt: now,
    },
    {
      id: "INV-2024-003",
      clientId: "client-lumen",
      client: "Elena Rossi",
      avatar: createAvatar("Elena Rossi"),
      date: daysAgo(25),
      dueDate: daysAgo(8),
      amount: "$2,800.00",
      subtotal: 2800,
      total: 2800,
      currency: "USD",
      templateId: "classic",
      templateName: "Classic Invoice",
      items: [
        { id: "inv-item-5", description: "E-Commerce UX Audit & Strategy Roadmap", quantity: 1, price: 1800 },
        { id: "inv-item-6", description: "Mobile Checkout Flow Prototypes", quantity: 8, price: 125 },
      ],
      amountPaid: 0,
      receiptAttachments: [],
      payments: [],
      status: "Overdue",
      workflowStatus: "Sent",
      statusColor: getStatusColor("Overdue"),
      clientColor: "bg-foreground/10",
      email: "elena@lumen.design",
      phone: "+1 (555) 410-9920",
      company: "Lumen Design Co.",
      address: "45 Prince St, New York, NY 10012",
      deliveryLink: "https://drive.google.com/drive/folders/lumen",
      createdAt: daysAgo(25),
      updatedAt: now,
    },
    {
      id: "INV-2024-004",
      clientId: "client-vertex",
      client: "James Okonkwo",
      avatar: createAvatar("James Okonkwo"),
      date: daysAgo(18),
      dueDate: daysAgo(4),
      amount: "$6,200.00",
      subtotal: 6200,
      total: 6200,
      currency: "USD",
      templateId: "classic",
      templateName: "Classic Invoice",
      items: [
        { id: "inv-item-7", description: "AI Dashboard Analytics & Data Viz Design Sprint", quantity: 32, price: 125 },
        { id: "inv-item-8", description: "Interactive High-Fidelity Design Token Package", quantity: 1, price: 2200 },
      ],
      amountPaid: 6200,
      paidAt: daysAgo(5),
      paymentMethod: "Stripe",
      paymentNotes: "Full balance processed online",
      receiptAttachments: [],
      payments: [
        {
          id: "pay-rec-3",
          amount: 6200,
          paidAt: daysAgo(5),
          method: "Stripe",
          notes: "Automated Stripe Charge ch_3O982...",
          receiptAttachments: [],
        },
      ],
      status: "Paid",
      workflowStatus: "Delivered",
      statusColor: getStatusColor("Paid"),
      clientColor: "bg-foreground/10",
      email: "james@vertex.ai",
      phone: "+1 (555) 518-3300",
      company: "Vertex AI",
      address: "500 Innovation Dr, Austin, TX 78701",
      deliveryLink: "https://drive.google.com/drive/folders/vertex",
      createdAt: daysAgo(18),
      updatedAt: now,
    },
    {
      id: "INV-2024-005",
      clientId: "client-horizon",
      client: "Chloe Zhao",
      avatar: createAvatar("Chloe Zhao"),
      date: daysAgo(3),
      dueDate: daysFromNow(21),
      amount: "$1,850.00",
      subtotal: 1850,
      total: 1850,
      currency: "USD",
      templateId: "classic",
      templateName: "Classic Invoice",
      items: [
        { id: "inv-item-9", description: "Patient Portal Mobile App UI Specs", quantity: 10, price: 125 },
        { id: "inv-item-10", description: "Accessibility Compliance Review (WCAG 2.1 AA)", quantity: 1, price: 600 },
      ],
      amountPaid: 0,
      receiptAttachments: [],
      payments: [],
      status: "Unpaid",
      workflowStatus: "Draft",
      statusColor: getStatusColor("Unpaid"),
      clientColor: "bg-foreground/10",
      email: "chloe@horizonhealth.co",
      phone: "+1 (555) 629-7712",
      company: "Horizon Health",
      address: "210 Commonwealth Ave, Boston, MA 02116",
      deliveryLink: "https://drive.google.com/drive/folders/horizon",
      createdAt: daysAgo(3),
      updatedAt: now,
    },
  ];

  // 4. Expenses (5)
  const expenses = [
    {
      id: "exp-001",
      description: "Annual Figma Organization Subscription",
      amount: 540,
      category: "Software",
      date: daysAgo(4),
      merchant: "Figma Inc.",
      notes: "Annual team seat license for product UI design",
      isTaxDeductible: true,
      createdAt: daysAgo(4),
      updatedAt: now,
    },
    {
      id: "exp-002",
      description: "AWS Cloud & Vercel Pro Hosting",
      amount: 145.5,
      category: "Software",
      date: daysAgo(8),
      merchant: "Vercel Inc.",
      notes: "Serverless client preview deployments and asset hosting",
      isTaxDeductible: true,
      createdAt: daysAgo(8),
      updatedAt: now,
    },
    {
      id: "exp-003",
      description: "Client Kickoff Dinner & Strategy Session",
      amount: 218.4,
      category: "Meals",
      date: daysAgo(11),
      merchant: "Bistro Central",
      notes: "Strategy meeting with Northwind Labs stakeholders",
      isTaxDeductible: true,
      createdAt: daysAgo(11),
      updatedAt: now,
    },
    {
      id: "exp-004",
      description: "Ergonomic 4K Display & Studio Thunderbolt Cables",
      amount: 689,
      category: "Office Supplies",
      date: daysAgo(19),
      merchant: "Dell Technologies",
      notes: "Studio workstation visual hardware upgrade",
      isTaxDeductible: true,
      createdAt: daysAgo(19),
      updatedAt: now,
    },
    {
      id: "exp-005",
      description: "Design Systems Conference 2026 Ticket & Travel",
      amount: 890,
      category: "Travel",
      date: daysAgo(25),
      merchant: "United Airlines & ConfPass",
      notes: "Annual professional development and industry speaker session",
      isTaxDeductible: true,
      createdAt: daysAgo(25),
      updatedAt: now,
    },
  ];

  // 5. Catalog Items (5)
  const catalog = [
    {
      id: "cat-brand",
      name: "Brand Identity & Visual Guidelines",
      description: "Complete logo suite, color palette, typography system, and comprehensive brand guidelines PDF.",
      defaultPrice: 2500,
      unit: "flat",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cat-ui-hour",
      name: "UI/UX Product Design",
      description: "Custom user interface and user experience design with responsive Figma design system components.",
      defaultPrice: 125,
      unit: "hour",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cat-sprint-day",
      name: "Design Sprint & Rapid Prototyping",
      description: "Full-day dedicated interactive prototyping, user flow testing, and clickable Figma demos.",
      defaultPrice: 950,
      unit: "day",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cat-audit",
      name: "UX & Accessibility Audit",
      description: "Comprehensive evaluation of usability heuristics and WCAG 2.1 AA accessibility compliance standards.",
      defaultPrice: 1200,
      unit: "flat",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "cat-retainer",
      name: "Monthly Advisory & Design Retainer",
      description: "Dedicated 20-hour monthly design advisory, rapid turnarounds, and creative direction support.",
      defaultPrice: 2200,
      unit: "flat",
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 6. Vendors (5)
  const vendors = [
    {
      id: "vendor-pixel",
      name: "Pixel Forge Studios",
      email: "billing@pixelforge.dev",
      phone: "+1 (555) 701-2200",
      avatar: createAvatar("Pixel Forge Studios"),
      company: "Pixel Forge Studios",
      address: "100 Art Center Blvd, Pasadena, CA 91105",
      notes: "3D graphics & custom vector illustrations partner",
      paypal: "billing@pixelforge.dev",
      stripe: "acct_pixelforge_701",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "vendor-copylab",
      name: "CopyLab Creative Agency",
      email: "accounts@copylab.co",
      phone: "+1 (555) 802-1188",
      avatar: createAvatar("CopyLab Creative Agency"),
      company: "CopyLab Creative Agency",
      address: "742 Evergreen Terrace, Portland, OR 97201",
      notes: "Brand messaging, UX microcopy, and technical writing",
      paypal: "accounts@copylab.co",
      stripe: "acct_copylab_802",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "vendor-cloudscale",
      name: "CloudScale DevOps",
      email: "invoicing@cloudscale.net",
      phone: "+1 (555) 912-3344",
      avatar: createAvatar("CloudScale DevOps"),
      company: "CloudScale Infrastructure",
      address: "340 Tech Way, San Jose, CA 95110",
      notes: "CI/CD setup and AWS infrastructure management",
      paypal: "invoicing@cloudscale.net",
      stripe: "acct_cloudscale_912",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "vendor-motioncraft",
      name: "MotionCraft VFX",
      email: "finance@motioncraft.tv",
      phone: "+1 (555) 441-5566",
      avatar: createAvatar("MotionCraft VFX"),
      company: "MotionCraft VFX",
      address: "220 Studio Lane, Los Angeles, CA 90028",
      notes: "Lottie animations and product promotional motion graphics",
      paypal: "finance@motioncraft.tv",
      stripe: "acct_motioncraft_441",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "vendor-qavanguard",
      name: "QA Vanguard Testing",
      email: "payments@qavanguard.io",
      phone: "+1 (555) 332-9988",
      avatar: createAvatar("QA Vanguard Testing"),
      company: "QA Vanguard LLC",
      address: "150 Quality Court, Denver, CO 80202",
      notes: "End-to-end automated testing and browser cross-compatibility",
      paypal: "payments@qavanguard.io",
      stripe: "acct_qavanguard_332",
      createdAt: now,
      updatedAt: now,
    },
  ];

  // 7. Outsourcing Invoices / Payables (5)
  const outsourcingInvoices = [
    {
      id: "PAY-501",
      vendorId: "vendor-pixel",
      vendor: "Pixel Forge Studios",
      avatar: createAvatar("Pixel Forge Studios"),
      date: daysAgo(15),
      dueDate: daysAgo(5),
      amount: "$1,200.00",
      subtotal: 1200,
      total: 1200,
      currency: "USD",
      templateId: "outsourcing",
      templateName: "Outsourcing Invoice",
      items: [
        { id: "pli-1", description: "Custom 3D Icon Pack for Acme Corporation launch", quantity: 1, price: 1200 },
      ],
      amountPaid: 1200,
      paidAt: daysAgo(10),
      paymentMethod: "PayPal",
      paymentNotes: "Paid in full via PayPal Business",
      receiptAttachments: [],
      payments: [
        { id: "ppay-1", amount: 1200, paidAt: daysAgo(10), method: "PayPal", notes: "PayPal Transaction #PP-990123" },
      ],
      status: "Paid",
      workflowStatus: "Delivered",
      statusColor: getStatusColor("Paid"),
      vendorColor: "bg-foreground/10",
      email: "billing@pixelforge.dev",
      phone: "+1 (555) 701-2200",
      company: "Pixel Forge Studios",
      address: "100 Art Center Blvd, Pasadena, CA 91105",
      paypal: "billing@pixelforge.dev",
      stripe: "acct_pixelforge_701",
      createdAt: daysAgo(15),
      updatedAt: now,
    },
    {
      id: "PAY-502",
      vendorId: "vendor-copylab",
      vendor: "CopyLab Creative Agency",
      avatar: createAvatar("CopyLab Creative Agency"),
      date: daysAgo(24),
      dueDate: daysAgo(4),
      amount: "$640.00",
      subtotal: 640,
      total: 640,
      currency: "USD",
      templateId: "outsourcing",
      templateName: "Outsourcing Invoice",
      items: [
        { id: "pli-2", description: "Website landing page copywriting & brand voice guidelines", quantity: 1, price: 640 },
      ],
      amountPaid: 0,
      receiptAttachments: [],
      payments: [],
      status: "Overdue",
      workflowStatus: "Sent",
      statusColor: getStatusColor("Overdue"),
      vendorColor: "bg-foreground/10",
      email: "accounts@copylab.co",
      phone: "+1 (555) 802-1188",
      company: "CopyLab Creative Agency",
      address: "742 Evergreen Terrace, Portland, OR 97201",
      paypal: "accounts@copylab.co",
      stripe: "acct_copylab_802",
      createdAt: daysAgo(24),
      updatedAt: now,
    },
    {
      id: "PAY-503",
      vendorId: "vendor-cloudscale",
      vendor: "CloudScale DevOps",
      avatar: createAvatar("CloudScale DevOps"),
      date: daysAgo(6),
      dueDate: daysFromNow(14),
      amount: "$950.00",
      subtotal: 950,
      total: 950,
      currency: "USD",
      templateId: "outsourcing",
      templateName: "Outsourcing Invoice",
      items: [
        { id: "pli-3", description: "Vercel & AWS Staging infrastructure Terraform configuration", quantity: 1, price: 950 },
      ],
      amountPaid: 0,
      receiptAttachments: [],
      payments: [],
      status: "Unpaid",
      workflowStatus: "Work Confirmed",
      statusColor: getStatusColor("Unpaid"),
      vendorColor: "bg-foreground/10",
      email: "invoicing@cloudscale.net",
      phone: "+1 (555) 912-3344",
      company: "CloudScale Infrastructure",
      address: "340 Tech Way, San Jose, CA 95110",
      paypal: "invoicing@cloudscale.net",
      stripe: "acct_cloudscale_912",
      createdAt: daysAgo(6),
      updatedAt: now,
    },
    {
      id: "PAY-504",
      vendorId: "vendor-motioncraft",
      vendor: "MotionCraft VFX",
      avatar: createAvatar("MotionCraft VFX"),
      date: daysAgo(9),
      dueDate: daysAgo(1),
      amount: "$1,500.00",
      subtotal: 1500,
      total: 1500,
      currency: "USD",
      templateId: "outsourcing",
      templateName: "Outsourcing Invoice",
      items: [
        { id: "pli-4", description: "App onboarding Lottie animations (3 distinct scenes)", quantity: 3, price: 500 },
      ],
      amountPaid: 1500,
      paidAt: daysAgo(7),
      paymentMethod: "Bank Transfer",
      paymentNotes: "Direct ACH deposit completed",
      receiptAttachments: [],
      payments: [
        { id: "ppay-4", amount: 1500, paidAt: daysAgo(7), method: "Bank Transfer", notes: "ACH Transfer Ref #ACH-88941" },
      ],
      status: "Paid",
      workflowStatus: "Delivered",
      statusColor: getStatusColor("Paid"),
      vendorColor: "bg-foreground/10",
      email: "finance@motioncraft.tv",
      phone: "+1 (555) 441-5566",
      company: "MotionCraft VFX",
      address: "220 Studio Lane, Los Angeles, CA 90028",
      paypal: "finance@motioncraft.tv",
      stripe: "acct_motioncraft_441",
      createdAt: daysAgo(9),
      updatedAt: now,
    },
    {
      id: "PAY-505",
      vendorId: "vendor-qavanguard",
      vendor: "QA Vanguard Testing",
      avatar: createAvatar("QA Vanguard Testing"),
      date: daysAgo(2),
      dueDate: daysFromNow(12),
      amount: "$800.00",
      subtotal: 800,
      total: 800,
      currency: "USD",
      templateId: "outsourcing",
      templateName: "Outsourcing Invoice",
      items: [
        { id: "pli-5", description: "Cross-device responsive UI & accessibility automated test suite", quantity: 1, price: 800 },
      ],
      amountPaid: 0,
      receiptAttachments: [],
      payments: [],
      status: "Unpaid",
      workflowStatus: "Draft",
      statusColor: getStatusColor("Unpaid"),
      vendorColor: "bg-foreground/10",
      email: "payments@qavanguard.io",
      phone: "+1 (555) 332-9988",
      company: "QA Vanguard LLC",
      address: "150 Quality Court, Denver, CO 80202",
      paypal: "payments@qavanguard.io",
      stripe: "acct_qavanguard_332",
      createdAt: daysAgo(2),
      updatedAt: now,
    },
  ];

  // 8. Todo Tasks (5)
  const todoTasks = [
    {
      id: "task-1",
      title: "Acme Corp: Design responsive tablet & mobile breakpoints",
      description: "Create tablet and mobile screens for the analytics dashboard in Figma",
      client: "Sarah Chen",
      clientId: "client-acme",
      clientEmail: "sarah@acmecorp.com",
      clientPhone: "+1 (555) 201-4400",
      clientWhatsapp: "+15552014400",
      invoiceId: "INV-2024-001",
      stage: "in-progress",
      priority: "High",
      tags: ["design", "ui", "mobile"],
      order: 0,
      estimate: "6h",
      dueDate: daysFromNow(3),
      createdAt: daysAgo(2),
      updatedAt: now,
    },
    {
      id: "task-2",
      title: "Northwind Labs: Review checkout flow animations",
      description: "Coordinate with MotionCraft on final micro-interaction transitions",
      client: "Marcus Webb",
      clientId: "client-northwind",
      clientEmail: "marcus@northwind.io",
      clientPhone: "+1 (555) 302-8811",
      invoiceId: "INV-2024-002",
      stage: "review",
      priority: "Medium",
      tags: ["motion", "fintech"],
      order: 0,
      estimate: "3h",
      dueDate: daysFromNow(2),
      createdAt: daysAgo(3),
      updatedAt: now,
    },
    {
      id: "task-3",
      title: "Vertex AI: Deliver high-res Figma handoff tokens",
      description: "Package design token JSON and export final SVG icons",
      client: "James Okonkwo",
      clientId: "client-vertex",
      clientEmail: "james@vertex.ai",
      invoiceId: "INV-2024-004",
      stage: "done",
      priority: "High",
      tags: ["tokens", "product"],
      order: 0,
      estimate: "8h",
      dueDate: daysAgo(1),
      createdAt: daysAgo(5),
      updatedAt: now,
    },
    {
      id: "task-4",
      title: "Lumen Design: Send overdue invoice reminder and follow up",
      description: "Follow up with Elena regarding net-15 payment for UX audit work",
      client: "Elena Rossi",
      clientId: "client-lumen",
      clientEmail: "elena@lumen.design",
      invoiceId: "INV-2024-003",
      stage: "backlog",
      priority: "High",
      tags: ["admin", "billing"],
      order: 0,
      estimate: "30m",
      dueDate: daysFromNow(1),
      createdAt: daysAgo(1),
      updatedAt: now,
    },
    {
      id: "task-5",
      title: "Horizon Health: Draft wireframes for patient onboarding portal",
      description: "Initial user journey wireframes and authentication steps",
      client: "Chloe Zhao",
      clientId: "client-horizon",
      clientEmail: "chloe@horizonhealth.co",
      invoiceId: "INV-2024-005",
      stage: "backlog",
      priority: "Medium",
      tags: ["wireframe", "medtech"],
      order: 1,
      estimate: "5h",
      dueDate: daysFromNow(7),
      createdAt: daysAgo(1),
      updatedAt: now,
    },
  ];

  // Write all JSON files
  console.log("Writing profiles.json...");
  await writeJson(path.join(USER_DATA_DIR, "profiles.json"), { profiles });

  console.log(`Writing profile files for ${profileId}...`);
  await writeJson(path.join(profileDir, "profile.json"), profile);
  await writeJson(path.join(profileDir, "security.json"), security);
  await writeJson(path.join(profileDir, "clients.json"), clients);
  await writeJson(path.join(profileDir, "invoices.json"), invoices);
  await writeJson(path.join(profileDir, "expenses.json"), expenses);
  await writeJson(path.join(profileDir, "catalog.json"), catalog);
  await writeJson(path.join(profileDir, "vendors.json"), vendors);
  await writeJson(path.join(profileDir, "outsourcing-invoices.json"), outsourcingInvoices);
  await writeJson(path.join(profileDir, "todo-tasks.json"), todoTasks);
  await writeJson(path.join(profileDir, "trash.json"), []);

  console.log("Profile and data populated successfully!");
  console.log(JSON.stringify({
    profile: profile.name,
    profession: profile.profession,
    email: profile.email,
    password: profilePassword,
    passwordHint,
    counts: {
      clients: clients.length,
      invoices: invoices.length,
      expenses: expenses.length,
      catalogItems: catalog.length,
      vendors: vendors.length,
      outsourcingInvoices: outsourcingInvoices.length,
      todoTasks: todoTasks.length,
    }
  }, null, 2));
}

main().catch((err) => {
  console.error("Error seeding profile data:", err);
  process.exit(1);
});
