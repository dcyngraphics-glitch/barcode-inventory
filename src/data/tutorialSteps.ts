import { ScanLine, Package, ClipboardList, Bell } from 'lucide-react';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: typeof ScanLine; // lucide icon component type
  ctaLabel: string; // button text for the action
  screenPath?: string; // optional route to navigate to
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'scan',
    title: 'Scan',
    description: 'Scan barcodes with your camera or enter manually.',
    icon: ScanLine,
    ctaLabel: 'Try Scanning',
    screenPath: '/',
  },
  {
    id: 'save',
    title: 'Save Product',
    description: 'Review scanned details, then save to your inventory.',
    icon: Package,
    ctaLabel: 'Got It',
    screenPath: '/inventory',
  },
  {
    id: 'manage',
    title: 'Manage Inventory',
    description: 'View, search, and edit your scanned items.',
    icon: ClipboardList,
    ctaLabel: 'View Inventory',
    screenPath: '/inventory',
  },
  {
    id: 'alerts',
    title: 'Set Up Alerts',
    description: 'Get notified before items expire.',
    icon: Bell,
    ctaLabel: 'Open Settings',
    screenPath: '/settings',
  },
];

export const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;
