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

  const handleSearchClick = () => {
    if (!isExpanded) {
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
    <div className={`relative z-20 search-field ${className}`}>
      <div
        ref={containerRef}
        className={`relative h-10 bg-white dark:bg-[#111111] border border-transparent dark:border-[var(--card-border)] rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.1)] transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center ${
          isExpanded || value ? 'w-[260px] sm:w-[320px]' : 'w-10'
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
          className={`absolute left-0 w-full h-full bg-transparent outline-none pl-4 pr-11 text-[13px] font-medium text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-[var(--muted)] transition-opacity duration-300 ${
            isExpanded || value
              ? 'opacity-100 pointer-events-auto delay-100'
              : 'opacity-0 pointer-events-none'
          }`}
        />
        
        <button
          onClick={handleSearchClick}
          className={`absolute right-1 h-8 w-8 rounded-full flex items-center justify-center transition-colors duration-300 z-10 shrink-0 ${
            isExpanded || value ? 'bg-[#2b2b2b] dark:bg-[#2b2b2b] hover:bg-[#1a1a1a]' : 'bg-[#2b2b2b] dark:bg-[var(--card)] hover:bg-[#1a1a1a] dark:hover:bg-[var(--card-border)]'
          }`}
          aria-label="Search"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white dark:text-[var(--foreground)] w-5 h-5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <circle
              cx="11"
              cy="11"
              r="4"
              fill="currentColor"
              stroke="none"
              style={{ transformOrigin: '11px 11px' }}
              className={`transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                isExpanded || value ? 'scale-100' : 'scale-0'
              }`}
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
