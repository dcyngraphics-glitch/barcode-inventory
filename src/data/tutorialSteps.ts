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
    description: 'Point your camera at a barcode, or tap the keyboard icon to enter it manually. The app looks up product info automatically.',
    icon: ScanLine,
    ctaLabel: 'Try Scanning',
    screenPath: '/',
  },
  {
    id: 'save',
    title: 'Save Product',
    description: 'After scanning, review the auto-filled details. Edit name, brand, price, and expiry date. Set your quantity and save to inventory.',
    icon: Package,
    ctaLabel: 'Got It',
    screenPath: '/inventory',
  },
  {
    id: 'manage',
    title: 'Manage Inventory',
    description: 'All your scanned items are grouped by product with FIFO sorting. Search, filter by expiry status, and tap to edit or remove batches.',
    icon: ClipboardList,
    ctaLabel: 'View Inventory',
    screenPath: '/inventory',
  },
  {
    id: 'alerts',
    title: 'Set Up Alerts',
    description: 'Enable push notifications and set your alert window (days before expiry). Never let items go to waste!',
    icon: Bell,
    ctaLabel: 'Open Settings',
    screenPath: '/settings',
  },
];

export const TOTAL_TUTORIAL_STEPS = TUTORIAL_STEPS.length;
