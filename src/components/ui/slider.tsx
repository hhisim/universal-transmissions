"use client";
import * as React from "react";
import { clsx, type ClassValue } from "clsx";

function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

interface SliderProps {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value = [0],
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      className,
      disabled = false,
    },
    ref
  ) => {
    const [localValue, setLocalValue] = React.useState(value);
    const currentValue = value[0] ?? localValue[0];

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVal = Number(e.target.value);
      setLocalValue([newVal]);
      onValueChange?.([newVal]);
    };

    const percent = ((currentValue - min) / (max - min)) * 100;

    return (
      <div
        ref={ref}
        className={cn("relative flex w-full items-center", className)}
      >
        <div className="relative h-5 w-full flex-1">
          {/* Track */}
          <div className="absolute top-1/2 left-0 right-0 h-1 -translate-y-1/2 rounded-full bg-white/10" />
          {/* Fill */}
          <div
            className="absolute top-1/2 left-0 h-1 -translate-y-1/2 rounded-full bg-white/40"
            style={{ width: `${percent}%` }}
          />
          {/* Input */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={currentValue}
            onChange={handleChange}
            disabled={disabled}
            className="absolute inset-0 w-full cursor-pointer opacity-0"
          />
          {/* Thumb visual */}
          <div
            className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-lg shadow-black/40 ring-2 ring-white/20"
            style={{ left: `calc(${percent}% - 8px)` }}
          />
        </div>
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
