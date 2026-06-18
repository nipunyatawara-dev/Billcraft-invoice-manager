"use client";

import React, { useState, useRef, useEffect } from 'react';

interface AnimatedSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export function AnimatedSearchBar({ value, onChange, placeholder = "Search...", className = "" }: AnimatedSearchBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close the search bar if the user clicks outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchClick = (e: React.MouseEvent) => {
    if (isExpanded) {
      e.stopPropagation();
      if (value) {
        onChange("");
      }
      setIsExpanded(false);
      inputRef.current?.blur();
    } else {
      setIsExpanded(true);
      // Focus the input field shortly after the expansion animation starts
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isExpanded) {
      inputRef.current?.blur();
      setIsExpanded(false);
    } else if (e.key === 'Escape') {
      setIsExpanded(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`relative z-20 search-field flex items-center ${className}`}>
      <div
        ref={containerRef}
        className={`relative h-10 bg-[var(--field)] border border-[var(--card-border)] rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center ${
          isExpanded || value ? 'w-[260px] sm:w-[320px] shadow-sm' : 'w-10'
        }`}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          placeholder={placeholder}
          className={`absolute left-0 w-full h-full bg-transparent outline-none pl-4 pr-11 text-[13px] font-semibold text-[var(--foreground)] placeholder-[var(--muted)]/50 transition-opacity duration-300 ${
            isExpanded || value
              ? 'opacity-100 pointer-events-auto delay-100'
              : 'opacity-0 pointer-events-none'
          }`}
        />
        
        <button
          onClick={handleSearchClick}
          className={`absolute right-1 top-1 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 z-10 shrink-0 ${
            isExpanded || value 
              ? 'bg-[var(--foreground)]/[0.04] text-[var(--muted)] hover:bg-[var(--foreground)]/[0.08] hover:text-[var(--foreground)]' 
              : 'bg-transparent text-[var(--muted)] hover:bg-[var(--foreground)]/[0.04] hover:text-[var(--foreground)]'
          }`}
          aria-label={isExpanded && value ? "Clear search" : "Search"}
        >
          {isExpanded && value ? (
            <i className="ph ph-x text-lg"></i>
          ) : (
            <i className="ph ph-magnifying-glass text-lg"></i>
          )}
        </button>
      </div>
    </div>
  );
}
