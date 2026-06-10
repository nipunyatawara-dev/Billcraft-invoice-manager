# BillCraft

<p align="center">
  <img src="./public/billcraft-dark-circle.png" width="180" alt="BillCraft logo">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-111827?style=for-the-badge&logo=nextdotjs" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=111827" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/local--first-JSON%20data-c4a7e7?style=for-the-badge" alt="Local-first JSON data" />
</p>

### Premium invoice management for freelancers and growing small businesses.

BillCraft is a polished, local-first invoicing dashboard built for freelancers, consultants, and small businesses that need one workspace for invoices, clients, outsourced work, revenue analytics, and billing tasks.

It is built with **Next.js App Router**, **React**, **TypeScript**, **Tailwind CSS**, and a lightweight local JSON data layer.

---

## What is BillCraft?

BillCraft helps freelancers, consultants, and early-stage small businesses run the everyday billing loop without jumping between spreadsheets, notes, and separate invoice trackers.

The app keeps each user's workspace in local profile folders, so invoices, clients, vendors, uploaded assets, security metadata, analytics preferences, and tasks stay on the machine by default. From the dashboard you can see paid revenue, pending totals, overdue invoices, recent clients, and payment health at a glance.

---

# Core Features

## Dashboard for payment health

Track collected revenue, pending invoices, overdue totals, paid ratios, and recent invoice activity from a compact dashboard.

<p align="center">
  <img src="./public/screenshots/dashboard.png" width="700" alt="BillCraft dashboard screenshot">
</p>

## Invoice creation and tracking

Create, edit, view, filter, search, and export invoices. BillCraft supports line items, due dates, paid/unpaid/overdue status, reusable clients, and one-time client entries.

<p align="center">
  <img src="./public/screenshots/invoices.png" width="700" alt="BillCraft invoices screenshot">
</p>

## Revenue analytics

Review revenue flow, paid ratio, average invoice value, average client value, top client performance, revenue trends, invoice aging, status mix, and collection health across monthly, quarterly, and yearly ranges. Analytics widgets can be shown, hidden, reordered, and saved per profile.

<p align="center">
  <img src="./public/screenshots/analytics.png" width="700" alt="BillCraft analytics screenshot">
</p>

## Theme & Typography Customization

Switch between light and dark modes, choose separate palettes for each mode, and collapse the color selectors to keep settings tidy. BillCraft features an advanced **Typography Settings** engine allowing you to switch typefaces across the platform (Inter, Open Sans, Google Sans Flex, Outfit, or Plus Jakarta Sans) to customize your workspace style.

<p align="center">
  <img src="./public/screenshots/theme-customization.png" width="700" alt="BillCraft theme & typography customization screenshot">
</p>

## Redesigned Kanban Tasks

Plan invoice work with a local to-do board. Cards have been completely redesigned for a premium look with custom interactive hover states, full-width "Outsource Task" action controls, dual-action completed flows (Inform/Upload grid), estimates, and custom tags.

<p align="center">
  <img src="./public/screenshots/todo.png" width="700" alt="BillCraft to-do board screenshot">
</p>

## Bulk Invoice Actions

Select multiple invoices at once using circular checkboxes and trigger bulk operations via a premium glassmorphic bottom actions bar. Supports staggered multi-PDF downloads to bypass browser popup block warnings, bulk status transitions, and bulk deletions with instant synchronization.

## Reusable Service Catalog

Manage reusable services, consulting rates, and itemized products. Set default billing units (hourly, flat rate, daily, or per unit) and default descriptions to speed up invoice line item entry.

## Expense & Tax Write-off Tracker

Log and categorize business expenses for tax write-offs. Monitor software subscriptions, travel costs, meals, marketing campaigns, and tax/legal fees. Mark items as tax-deductible to compute collection write-offs.

## Payment Tracking & Simulators

Record multiple partial payments (installments) per invoice with amounts, dates, custom payment notes, and payment methods. Attach receipt files (images/PDFs) stored locally. Run Stripe Checkout sandbox simulations (card validation, signature webhooks, auto-updates to Paid) or compile/dispatch simulated SMTP Email Reminders directly from the UI.

## Task-to-Invoice Integration

Import completed tasks from your To-Do board directly into invoice line items. Automatically converts estimate strings (e.g., "5h 30m") to billable quantities multiplied by profile hourly rates, tagging tasks as "Billed" to avoid double-billing.

## Fluid Page-Specific Skeletons

To deliver an instantaneous, high-fidelity experience, BillCraft implements custom, native route-specific skeleton loading screens for all major views. Layout shifts are eliminated, and tab transitions feel smooth and responsive.

---

## All Features

- **Profiles & Local Data**: Up to 5 password-protected billing profiles. All profile identity, configuration, phone, email, signature, and avatars remain stored locally in private folders under `User data/`.
- **Invoices**: Create, edit, view, search, filter, and export itemized invoices as `.pdf`.
- **Payment Tracking & Simulators**: Track partial payments/installments with details like amount, date, method, receipt files (base64 image/PDF uploads), and overall payment notes. Simulators in the UI process Stripe Checkout sandboxes (card checks, webhook events, auto-paid updates) and compile SMTP Email Reminders with log output.
- **Task-to-Invoice Automation**: Import done tasks from the To-Do board directly into invoice line items. Estimate durations (e.g. "2h 45m") auto-convert to billable hours based on profile rates, tagging tasks as "Billed" to avoid double-charging.
- **Bulk Actions**: Glassmorphic bottom actions bar for staggered multi-PDF downloads (avoiding browser pop-up blocks), bulk status transitions, and bulk invoice deletions.
- **Clients & Outsourcing**: Manage clients (breakdown stats, total billed, invoices) and subcontractors (vendors list, vendor payable logs, vendor invoice exports as `.txt`).
- **Service Catalog**: Register reusable services and products with default pricing, units (hourly, daily, flat, unit), and descriptions.
- **Expense & Tax Logging**: Track vendor-facing expenses across categories (Travel, Software, office supplies, etc.) and toggle tax-deductible switches.
- **Redesigned To-Do Board**: Drag-and-drop Kanban tiles (estimate, priority, tags) with a top drag-to-delete Trash zone, countdown Undo pill, Done notification controls (Email, WhatsApp, SMS), and vendor outsourcing payable automation.
- **Settings, Appearance & Fonts**: Switch toast positions, toggle auto-reminders, export data to JSON/CSV, collapse theme color palettes, dynamically change system-wide typefaces (Inter, Open Sans, Google Sans Flex, Outfit, Plus Jakarta Sans), and manage the Trash Bin settings tab (recovering soft-deleted invoices or emptying trash).
- **Premium UX & Animations**: Immersive circular theme-switch reveals, custom route skeletons, and premium glassmorphic modals/bars.

---

# Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 and CSS custom properties |
| Theme | next-themes |
| Charts | Recharts with local EvilCharts wrappers |
| Animation | Motion |
| UI utilities | Base UI, lucide-react, shadcn, class-variance-authority, tailwind-merge |
| Toasts | Sileo |
| Cross-Platform | cross-env for seamless multi-platform development environment setup |
| Data | Local JSON files through Next.js API routes |
| Persistence | `User data/` profile folders |
| Assets | Local profile asset storage served through `/api/user-data/asset` |

---

# Installation

## Prerequisites

- Node.js 20+
- npm

## Run locally

```bash
git clone https://github.com/NippaGG/Billcraft-invoice-manager.git
cd Billcraft-invoice-manager
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

