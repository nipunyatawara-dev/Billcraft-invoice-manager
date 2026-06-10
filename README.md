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

### Profiles, Security, and Local Data

- Create and switch between up to 5 local billing profiles
- Store profile identity, business name, email, phone, avatar, and signature
- Require a profile password during profile creation
- Unlock password-protected profiles and log out of active protected sessions
- Add and update password hints
- Change profile passwords from settings
- Keep each profile's data in its own local folder
- Save uploaded profile/client/vendor assets locally
- Store password hashes and salts in each profile's local `security.json`
- Keep `User data/` out of git by default

### Invoices

- Create invoices with itemized work
- Edit existing invoices
- View invoice details in a modal
- Track paid, unpaid, and overdue status
- Search invoices by client, invoice ID, or email
- Filter invoices by status
- Use saved clients or one-time client contacts
- Save new clients as regular clients or one-time invoice contacts
- Upload client avatars while creating invoice contacts
- Preview invoice profile, client details, line items, and totals before export
- Export invoices as `.pdf` files
- Record multiple partial payments (installments) per invoice
- Track payment amount, date, notes, and payment methods (Bank transfer, Card, Cash, PayPal, Wise, Check, Other)
- Attach receipt documents/images (saved locally as base64 assets) directly to payment records
- Auto-compute invoice payment states: Paid, Partially Paid, Overdue, or Unpaid
- **Interactive Sandbox Simulators**:
  - **Stripe Checkout Simulator**: Simulates network card validation and Stripe webhook events (`checkout.session.completed`, etc.) to auto-update invoice status with real-time logs
  - **Email Reminder Simulator**: Simulates PDF generation, SMTP server attachments, and customer email dispatching with log feedback
- **Task-to-Invoice Automation**:
  - Import completed done tasks directly from the To-Do board as itemized line items
  - Auto-convert task estimates (e.g. "4h 30m") to billable quantities using the profile's hourly rate
  - Auto-tag tasks as "Billed" and link them to the new invoice ID to avoid duplicate billing
- **Bulk actions bar** (with circular selection checkboxes and a glassmorphic quick-action menu):
  - Intelligent staggered multi-PDF exports (avoiding browser pop-up blocks)
  - Bulk status updates (Paid, Unpaid, Overdue)
  - Bulk invoice deletions with instant local synchronization

### Clients

- Add and edit client records
- Upload client avatars
- Search clients by name, email, or company
- See total billed, invoice count, and status breakdown per client
- Expand client cards for deeper invoice context

### Service Catalog

- Manage reusable services and product items
- Set default prices and billing units (hour, flat rate, day, unit)
- Add default descriptions for auto-filling invoice line items
- Live search bar and dynamic catalog statistics (Total Services, Average Rate, Premium Service Rate, Hourly Services count)
- Add, edit, and delete catalog items

### Expenses & Tax Tracking

- Track and log vendor-facing expenses
- Categorize spending (Travel, Software, Office Supplies, Meals, Marketing, Tax/Legal, Other) with custom icons
- Toggle tax-deductible switch for write-offs
- Add custom transaction notes and receipts references
- Dynamic expense analytics: Total expenses, tax-deductible totals, average spend, and logged records
- Filter expenses by category tabs or search queries

### Analytics

- Revenue flow chart
- Paid invoice ratio
- Average invoice value
- Average client value
- Top client summary
- Revenue trend chart for paid and open revenue
- Status mix chart for paid, unpaid, and overdue totals
- Top clients chart
- Invoice aging chart
- Collection gauge
- Time ranges for this month, this quarter, and this year
- Show, hide, reorder, reset, and save analytics widgets per profile

### Outsourcing

- Track vendor-facing payable invoices
- Add reusable vendors or one-time vendor contacts
- Save and update vendor records
- Upload vendor avatars
- Search and filter outsourcing invoices
- Track paid, unpaid, and overdue vendor payments
- Preview payable details, line items, and totals
- Export outsourcing invoices as `.txt` files

### To-Do Board

- Drag tasks between Backlog, In Progress, Review, and Done
- Add and edit tasks
- Delete tasks
- Set priority, due date, estimate, tags, and client/vendor context
- Persist task order per profile
- **Redesigned premium kanban tiles** with modern borders, transition effects, and larger typographic scales
- **Full-width outsource button** with premium styling and micro-interaction scale feedback
- **Crisp dual column footer action controls** (Inform/Upload) for completed tasks
- **Dynamic Trash Drop Zone**: Drag tasks to the top delete zone to trash them, or select multiple cards to perform bulk trashing
- **Countdown Undo Pill**: Revert task deletions with an interactive countdown timer
- **Subcontractor Payable Automation**: Outsource tasks to vendor records, automatically generating a payable invoice under Outsourcing and tagging the task as "Outsourced"
- **Inform Client Flow**: Trigger notifications (Email, WhatsApp, SMS) directly when tasks are completed

### Settings, Appearance, and Data Export

- Update profile details
- Choose currency
- Toggle light and dark modes
- Configure toast notification position
- Toggle invoice reminder notification preference
- Export profile data as JSON
- Export profile data as CSV
- Require profile password confirmation before export when a profile is password-protected
- Delete the current profile or all local profiles from settings
- **Collapse & Expand theme palettes** to keep color customization dashboard tidy
- **Premium Font Selector engine** allowing users to choose their typeface across the platform, dynamically supporting *Inter*, *Open Sans*, *Google Sans Flex*, *Outfit*, and *Plus Jakarta Sans*
- **Trash Bin Manager**: Recover soft-deleted invoices with all original details or permanently wipe them to free up local profile storage slots

### Premium UX & Fluid Animations

- **Circular Reveal Transitions**: Immersive clip-path reveal animations when toggling between light and dark themes
- **Page-Specific Route Skeletons**: Dedicated, custom React loading skeleton fallbacks for the Dashboard, Invoices, Clients, Outsourcing, To-Do, and Settings segments to eliminate page layout shifts
- **Glassmorphic Floating Components**: Premium blurred background action bars, modals, and drop-ups styled with curated micro-animations

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

---

# Project Structure

```text
src/
  app/
    api/user-data/      Local JSON data endpoint
    api/user-data/asset/  Local profile asset endpoint
    analytics/          Revenue analytics page
    catalog/            Service and rate catalog page
    clients/            Client management page
    expenses/           Business expense and tax tracker page
    invoices/           Invoice management page
    outsourcing/        Vendor/payable invoice page
    settings/           Profile, appearance, preference, and trash settings
    todo/               Billing task board
  components/           Shared layout, theme, toast, and UI helpers
  components/ui/        Reusable UI components (animated search bar, etc.)
  data/                 Invoice, client, vendor, and todo data types/helpers
  hooks/                Local data, currency, theme, toast, and outsourcing hooks
  lib/                  Toast utilities and local data store
public/
  screenshots/          README screenshots
  billcraft-*.png       Brand assets
User data/              Local runtime data, gitignored
```

---

# Available Scripts

```bash
npm run dev      # Start the Next.js development server
npm run build    # Create a production build
npm run start    # Start the production server
npm run lint     # Run ESLint
```

---

# Local Data Model

```text
User data/
  profiles.json
  <profile-id>/
    profile.json
    security.json
    clients.json
    invoices.json
    vendors.json
    outsourcing-invoices.json
    todo-tasks.json
    expenses.json
    catalog.json
    trash.json
    assets/
```

This directory is intentionally ignored by git so real client, invoice, and profile details do not get committed.

Profile passwords are not stored as plain text. BillCraft stores a password hash, salt, optional hint, and password change timestamp in `security.json`.
