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

BillCraft is a polished, local-first invoicing dashboard built mainly for freelancers and small new and upcoming businesses that need one workspace for invoices, clients, outsourced work, revenue analytics, and billing tasks.

It is built with **Next.js App Router**, **React**, **TypeScript**, **Tailwind CSS**, and a lightweight local JSON data layer.

---

## What is BillCraft?

BillCraft helps freelancers, consultants, and early-stage small businesses run the everyday billing loop without jumping between spreadsheets, notes, and separate invoice trackers.

The app keeps each user's workspace in local profile folders, so invoices, clients, vendors, assets, and tasks stay on the machine by default. From the dashboard you can see paid revenue, pending totals, overdue invoices, recent clients, and payment health at a glance.

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

Review revenue flow, paid ratio, average invoice value, average client value, and top client performance across monthly, quarterly, and yearly ranges.

<p align="center">
  <img src="./public/screenshots/analytics.png" width="700" alt="BillCraft analytics screenshot">
</p>

## Theme customization

Switch between light and dark modes, choose separate palettes for each mode, and keep the workspace visually aligned with the way you like to work.

<p align="center">
  <img src="./public/screenshots/theme-customization.png" width="700" alt="BillCraft theme customization screenshot">
</p>

## Kanban-style billing tasks

Plan invoice work with a local to-do board. Tasks support drag-and-drop stages, priorities, due dates, client labels, estimates, and tags.

<p align="center">
  <img src="./public/screenshots/todo.png" width="700" alt="BillCraft to-do board screenshot">
</p>

---

## All Features

### Profiles and Local Data

- Create and switch between local billing profiles
- Store profile identity, business name, email, phone, avatar, and signature
- Keep each profile's data in its own local folder
- Save uploaded profile/client/vendor assets locally
- Keep `User data/` out of git by default

### Invoices

- Create invoices with itemized work
- Edit existing invoices
- View invoice details in a modal
- Track paid, unpaid, and overdue status
- Search invoices by client, invoice ID, or email
- Filter invoices by status
- Save new clients as regular clients or one-time invoice contacts
- Export invoices as `.txt` files

### Clients

- Add and edit client records
- Upload client avatars
- Search clients by name, email, or company
- See total billed, invoice count, and status breakdown per client
- Expand client cards for deeper invoice context

### Analytics

- Revenue flow chart
- Paid invoice ratio
- Average invoice value
- Average client value
- Top client summary
- Time ranges for this month, last quarter, and this year

### Outsourcing

- Track vendor-facing payable invoices
- Save vendor records
- Search and filter outsourcing invoices
- Track paid, unpaid, and overdue vendor payments
- Export outsourcing invoices as `.txt` files

### To-Do Board

- Drag tasks between Backlog, In Progress, Review, and Done
- Add and edit tasks
- Set priority, due date, estimate, tags, and client/vendor context
- Persist task order per profile

### Settings and Appearance

- Update profile details
- Choose currency
- Toggle light and dark modes
- Select separate palettes for light and dark mode
- Configure toast notification position
- Manage local profile deletion from settings

---

# Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 and CSS custom properties |
| Theme | next-themes |
| Data | Local JSON files through Next.js API routes |
| Persistence | `User data/` profile folders |

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
    api/user-data/      Local JSON data and asset endpoints
    analytics/          Revenue analytics page
    clients/            Client management page
    invoices/           Invoice management page
    outsourcing/        Vendor/payable invoice page
    settings/           Profile, appearance, and preference settings
    todo/               Billing task board
  components/           Shared layout, theme, toast, and UI helpers
  data/                 Invoice, client, vendor, and todo data types/helpers
  hooks/                Local data, currency, theme, toast, and outsourcing hooks
  lib/                  Toast utilities and local data store
public/
  screenshots/          README screenshots
  billcraft-*.png       Brand assets
User data/              Local runtime data, gitignored
```

---

# Local Data Model

BillCraft stores runtime data under:

```text
User data/
  profiles.json
  <profile-id>/
    profile.json
    clients.json
    invoices.json
    vendors.json
    outsourcing-invoices.json
    todo-tasks.json
    assets/
```

This directory is intentionally ignored by git so real client, invoice, and profile details do not get committed.
