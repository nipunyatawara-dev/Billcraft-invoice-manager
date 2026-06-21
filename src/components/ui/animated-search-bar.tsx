"use client";

import React, { useRef } from 'react';

interface AnimatedSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function AnimatedSearchBar({ value, onChange, placeholder = "Search...", className = "" }: AnimatedSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full sm:w-[320px] search-field group ${className}`}>
      {/* Search Icon on the left */}
      <i className="ph ph-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/60 text-[17px] pointer-events-none transition-colors duration-200 group-focus-within:text-accent" />
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 bg-field hover:bg-foreground/[0.03] focus:bg-card border border-card-border hover:border-card-border/80 focus:border-accent rounded-xl pl-10 pr-9 text-[13px] font-medium text-foreground placeholder-muted/50 focus:outline-none focus:ring-2 focus:ring-accent/15 transition-all duration-300"
      />
      
      {/* Clear Button on the right */}
      <button
        onClick={handleClear}
        className={`absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-foreground/[0.04] transition-all duration-200 ${
          value ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        aria-label="Clear search"
      >
        <i className="ph ph-x text-[15px]"></i>
      </button>
    </div>
  );
}

