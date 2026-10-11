import {
  Activity, ArrowDown, Binary, Braces, Brain, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Cloud, Cpu,
  Database, DollarSign, Gauge, HardDrive, Layers, LayoutGrid, Leaf, Monitor, Network, OctagonAlert, Orbit, Pause,
  Play, RotateCcw, ScanLine, Send, Server, ShieldCheck, ShieldOff, SlidersHorizontal, Timer, TrendingUp,
  TriangleAlert, Upload, Waves, X, Zap,
} from 'lucide-react';

// Explicit registry keeps the bundle to the icons we use while letting data tables refer to icons by name.
const ICONS = {
  Activity, ArrowDown, Binary, Braces, Brain, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Cloud, Cpu,
  Database, DollarSign, Gauge, HardDrive, Layers, LayoutGrid, Leaf, Monitor, Network, OctagonAlert, Orbit, Pause,
  Play, RotateCcw, ScanLine, Send, Server, ShieldCheck, ShieldOff, SlidersHorizontal, Timer, TrendingUp,
  TriangleAlert, Upload, Waves, X, Zap,
};

export function Icon({ name, ...props }) {
  const C = ICONS[name];
  return C ? <C aria-hidden="true" strokeWidth={1.75} {...props} /> : null;
}
