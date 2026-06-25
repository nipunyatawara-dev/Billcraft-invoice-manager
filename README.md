# BillCraft

<p align="center">
  <img src="./public/billcraft-dark-circle.png" width="180" alt="BillCraft logo">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-111827?style=for-the-badge&logo=nextdotjs" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/local--first-JSON%20data-c4a7e7?style=for-the-badge" alt="Local-first JSON data" />
</p>

BillCraft is a local-first invoicing dashboard for freelancers, consultants, and small businesses. It provides a single workspace to manage invoices, clients, vendors, tasks, and revenue analytics.

All data is stored locally on your machine in profile folders, keeping your invoicing and client details private.

---

## Key Features

### Dashboard Analytics
Monitor collected revenue, pending invoices, overdue totals, paid ratios, and recent billing activity at a glance.

<p align="center">
  <img src="./assets/01-dashboard.png" width="800" alt="BillCraft dashboard screenshot">
</p>

### Invoice Tracking & Management
Create, edit, search, filter, and export itemized invoices as PDF files. Supports due dates, payment status (paid, unpaid, overdue), and reusable or one-time client entries.

<p align="center">
  <img src="./assets/02-invoices.png" width="800" alt="BillCraft invoices screenshot">
</p>

<p align="center">
  <img src="./assets/03-create-invoice.png" width="800" alt="BillCraft invoice creator screenshot">
</p>

### Customization & Appearance
Choose between light and dark modes, customize color palettes, select system-wide typefaces (Inter, Open Sans, Google Sans Flex, Outfit, or Plus Jakarta Sans), and toggle corner styles between Rounded and Squircle (macOS-like).

<p align="center">
  <img src="./assets/04-settings-appearance.png" width="800" alt="BillCraft theme & typography customization screenshot">
</p>

### Core Functionality
- **Local Data & Profiles**: Supports up to 5 password-protected billing profiles. Personal details, configuration, and avatars are stored locally in the `User data/` folder.
- **Payment & Reminders Simulators**: Track partial payments/installments with attachments. Test checkout flows using simulated Stripe sandboxes and SMTP email reminders.
- **Task-to-Invoice Import**: Import completed tasks from the Kanban board directly into invoice line items. Estimated hours automatically calculate based on profile rates.
- **Bulk Actions**: Perform bulk operations, including downloading multiple PDFs, updating invoice statuses, and deleting entries.
- **Subcontractor Management**: Track billing stats for clients and manage subcontractor (vendor) payable logs and PDF invoice exports.
- **Product & Service Catalog**: Save reusable services and products with default pricing units (hourly, daily, flat rate, or unit price).
- **Expense Tracking**: Log expenses by category (e.g., Travel, Software, Office Supplies) and mark them as tax-deductible.
- **Kanban Task Board**: Manage tasks using a drag-and-drop board with estimates, priorities, tags, and automated notifications (Email, SMS, WhatsApp).

---

## Tech Stack

| Component | Technology |
| --- | --- |
| **Framework** | Next.js 15 (App Router) |
| **Frontend UI** | React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 & CSS Variables |
| **Theme Management** | next-themes |
| **Charts** | Recharts |
| **Animations** | Motion |
| **UI Components** | Base UI, shadcn/ui, Lucide React |
| **Data Layer** | Local JSON files accessed via API routes |
| **Storage** | Local file system (`User data/` directory) |

---

## Installation

### Prerequisites
- Node.js 20+
- npm

### Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/NippaGG/Billcraft-invoice-manager.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Billcraft-invoice-manager
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.
