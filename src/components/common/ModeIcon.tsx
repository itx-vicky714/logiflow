'use client';
import { Truck, Train, Plane, Ship } from 'lucide-react';

interface ModeIconProps {
  mode: string;
  size?: number;
  className?: string;
}

export function ModeIcon({ mode, size = 16, className = '' }: ModeIconProps) {
  const normalized = mode?.toLowerCase();
  const props = { size, className };
  
  if (normalized === 'road' || normalized === 'truck') 
    return <Truck {...props} />;
  if (normalized === 'rail' || normalized === 'train') 
    return <Train {...props} />;
  if (normalized === 'air') 
    return <Plane {...props} />;
  if (normalized === 'sea' || normalized === 'ship') 
    return <Ship {...props} />;
  return <Truck {...props} />;
}
