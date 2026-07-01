"use client";

/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { WorkspaceFormModal } from "@/components/workspace-form-modal";
import { PhoneInput } from "@/components/phone-input";
import { ImagePlus, Link2, Mail, MapPin, StickyNote, User } from "lucide-react";

export type ClientForm = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
  address: string;
  deliveryLink: string;
  avatar: string;
  notes: string;
};

interface ClientFormModalProps {
  isEditing: boolean;
  form: ClientForm;
  setForm: React.Dispatch<React.SetStateAction<ClientForm>>;
  isSaving: boolean;
  closeModal: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  profilePhone?: string;
}

export function ClientFormModal({
  isEditing,
  form,
  setForm,
  isSaving,
  closeModal,
  onSubmit,
  onImageChange,
  profilePhone,
}: ClientFormModalProps) {
  const title = isEditing ? "Edit Client" : "Add Client";
  const subtitle = isEditing ? "Edit Session" : "Draft Workspace";

  const leftPanel = (
    <>
      <div className="surface-card p-4 space-y-4">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          <User className="size-3.5 text-muted/80" />
          Profile & Company
        </h3>
        <div className="flex items-center gap-3">
          <label className="relative size-12 rounded-xl bg-foreground/[0.04] hover:bg-foreground/[0.08] flex items-center justify-center shrink-0 border border-card-border border-dashed cursor-pointer transition-[background-color,border-color] duration-200 ease-out">
            <input type="file" accept="image/*" onChange={onImageChange} className="sr-only" />
            {form.avatar ? (
              <img className="size-full rounded-xl object-cover outline outline-1 -outline-offset-1 outline-foreground/10" alt="Client preview" src={form.avatar} />
            ) : (
              <ImagePlus className="size-5 text-muted/70" />
            )}
          </label>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Client Name *"
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="field-control px-3 py-2 text-[13px] rounded-lg"
            />
            <input
              type="text"
              placeholder="Company"
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              className="field-control px-3 py-2 text-[13px] rounded-lg"
            />
          </div>
        </div>
      </div>

      <div className="surface-card p-4 space-y-4">
        <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
          <Mail className="size-3.5 text-muted/80" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            className="field-control px-3 py-2 text-[13px] rounded-lg"
          />
          <PhoneInput
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone })}
            hintPhone={form.phone || profilePhone}
            inputClassName="text-[13px] rounded-lg"
            selectClassName="text-[12px] rounded-lg"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="client-whatsapp">
            WhatsApp
          </label>
          <PhoneInput
            id="client-whatsapp"
            value={form.whatsapp}
            onChange={(whatsapp) => setForm({ ...form, whatsapp })}
            hintPhone={form.phone || form.whatsapp || profilePhone}
            inputClassName="text-[13px] rounded-lg"
            selectClassName="text-[12px] rounded-lg"
          />
        </div>
      </div>
    </>
  );

  const rightPanel = (
    <div className="surface-card p-4 space-y-4">
      <h3 className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5">
        <Link2 className="size-3.5 text-muted/80" />
        Work Delivery & Address
      </h3>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase" htmlFor="client-delivery-link">
          Finished Work Folder
        </label>
        <input
          id="client-delivery-link"
          type="url"
          value={form.deliveryLink}
          onChange={(event) => setForm({ ...form, deliveryLink: event.target.value })}
          placeholder="https://drive.google.com/..."
          className="field-control px-3 py-2 text-[13px] rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5" htmlFor="client-address">
          <MapPin className="size-3 text-muted/70" />
          Billing Address
        </label>
        <textarea
          id="client-address"
          value={form.address}
          onChange={(event) => setForm({ ...form, address: event.target.value })}
          placeholder="Billing address for client statements"
          className="field-control min-h-16 px-3 py-2 text-[13px] resize-none rounded-lg"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold text-muted tracking-wider uppercase flex items-center gap-1.5" htmlFor="client-notes">
          <StickyNote className="size-3 text-muted/70" />
          Relationship Notes
        </label>
        <textarea
          id="client-notes"
          value={form.notes}
          onChange={(event) => setForm({ ...form, notes: event.target.value })}
          placeholder="Scope rules, payment preferences, context notes..."
          className="field-control min-h-16 px-3 py-2 text-[13px] resize-none rounded-lg"
        />
      </div>
    </div>
  );

  return (
    <WorkspaceFormModal
      title={title}
      subtitle={subtitle}
      onClose={closeModal}
      onSubmit={onSubmit}
      isSaving={isSaving}
      maxWidth="4xl"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      footerActions={{
        submitLabel: isEditing ? "Save Changes" : "Add Client",
      }}
    />
  );
}
