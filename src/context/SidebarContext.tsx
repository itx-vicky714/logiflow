"use client";

import React, { createContext, useContext, useState } from 'react';

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobileOpen: boolean;
  toggleMobile: () => void;
  closeMobile: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({ 
  collapsed: false, 
  toggle: () => {},
  isMobileOpen: false,
  toggleMobile: () => {},
  closeMobile: () => {}
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <SidebarContext.Provider value={{ 
      collapsed, 
      toggle: () => setCollapsed(c => !c),
      isMobileOpen,
      toggleMobile: () => setIsMobileOpen(m => !m),
      closeMobile: () => setIsMobileOpen(false)
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() { return useContext(SidebarContext); }

