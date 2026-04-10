"use client";
import * as React from "react";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

interface TabsContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("Tabs subcomponents must be used within Tabs");
  return ctx;
}

interface TabsProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const Tabs = ({ value, defaultValue, onValueChange, children, className }: TabsProps) => {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const current = value ?? internal;

  const handleChange = (v: string) => {
    if (value === undefined) setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsContext.Provider value={{ value: current, onChange: handleChange }}>
      <div className={cn("", className)}>{children}</div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

const TabsList = ({ children, className }: TabsListProps) => (
  <div
    className={cn(
      "grid w-full grid-cols-2 gap-1 rounded-2xl bg-black/30 p-1",
      className
    )}
  >
    {children}
  </div>
);

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const TabsTrigger = ({ value, children, className }: TabsTriggerProps) => {
  const { value: selected, onChange } = useTabsContext();
  const isActive = selected === value;

  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "rounded-xl px-4 py-2 text-xs font-medium tracking-[0.22em] uppercase transition-all",
        isActive
          ? "bg-white/10 text-white"
          : "text-white/50 hover:text-white/80",
        className
      )}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

const TabsContent = ({ value, children, className }: TabsContentProps) => {
  const { value: selected } = useTabsContext();
  if (selected !== value) return null;
  return <div className={cn("mt-4", className)}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
