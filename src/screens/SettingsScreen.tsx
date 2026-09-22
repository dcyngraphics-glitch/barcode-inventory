import { useCallback, useMemo, useState } from 'react';
import { Download, Trash2, Info, Moon, Sun, Monitor, ExternalLink, AlertTriangle } from 'lucide-react';
import type { Product, Batch } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { requestPermission, getPermissionStatus } from '@/services/notificationService';
import { getAllProducts } from '@/services/catalogService';
import { getAllBatches } from '@/services/inventoryService';
import { getDB } from '@/db/database';
import { SettingsToggle } from '@/components/SettingsToggle';
import { SettingsStepper } from '@/components/SettingsStepper';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';

type ThemeOption = 'auto' | 'light' | 'dark';

const THEME_CYCLE: Record<ThemeOption, ThemeOption> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
};

const THEME_ICON: Record<ThemeOption, React.ReactNode> = {
  auto: <Monitor size={18} />,
  light: <Sun size={18} />,
  dark: <Moon size={18} />,
};

const THEME_LABEL: Record<ThemeOption, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

export function SettingsScreen() {
  const { settings, updateSettings } = useSettings();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { toasts, showToast, dismissToast } = useToast();

  // Handle notification toggle
  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const permission = await requestPermission();
        if (permission === 'granted') {
          updateSettings({ notificationsEnabled: true });
        } else {
          showToast('error', 'Notifications blocked by browser');
          updateSettings({ notificationsEnabled: false });
        }
      } else {
        updateSettings({ notificationsEnabled: false });
      }
    },
    [showToast, updateSettings]
  );

  // Handle alert window change
  const handleAlertWindowChange = useCallback(
    (days: number) => {
      updateSettings({ alertWindowDays: days });
    },
    [updateSettings]
  );

  // Handle theme cycle
  const handleThemeCycle = useCallback(() => {
    if (!settings) return;
    const nextTheme = THEME_CYCLE[settings.theme];
    updateSettings({ theme: nextTheme });
  }, [settings, updateSettings]);

  // Handle export
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const products: Product[] = await getAllProducts();
      const batches: Batch[] = await getAllBatches();

      const exportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        products,
        batches,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `barcode-inventory-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('success', `Exported ${products.length} products, ${batches.length} batches`);
    } catch (err) {
      console.error('Failed to export:', err);
      showToast('error', 'Failed to export inventory');
    } finally {
      setExporting(false);
    }
  }, [showToast]);

  // Handle clear all data — also reset settings
  const handleClearAll = useCallback(async () => {
    try {
      const db = await getDB();
      await db.clear('catalog');
      await db.clear('inventory');
      // Reset settings to defaults
      updateSettings({ ...DEFAULT_SETTINGS });
      setShowClearDialog(false);
      showToast('success', 'All data cleared');
    } catch (err) {
      console.error('Failed to clear data:', err);
      showToast('error', 'Failed to clear data');
      setShowClearDialog(false);
    }
  }, [showToast, updateSettings]);

  // Loading state from hook
  const loading = settings === null;

  if (loading) {
    return (
      <div className="settings-skeleton">
        <div className="settings-skeleton-title" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="settings-skeleton-card" />
        ))}
      </div>
    );
  }

  const permissionDenied = useMemo(
    () => settings!.notificationsEnabled && getPermissionStatus() === 'denied',
    [settings!.notificationsEnabled]
  );

  return (
    <div className="settings-screen">
      {/* Header */}
      <div className="settings-header">
        Settings
      </div>

      {/* Notifications Section */}
      <h2 className="settings-section-label">
        Notifications
      </h2>
      <div className="settings-card settings-card-stack">
        <SettingsToggle
          enabled={settings!.notificationsEnabled}
          onChange={handleNotificationToggle}
          label="Push Notifications"
          description="Get notified when items are about to expire"
        />
        {permissionDenied && (
          <div className="settings-warning">
            <AlertTriangle size={16} />
            Notifications blocked by browser
          </div>
        )}
        <SettingsStepper
          value={settings!.alertWindowDays}
          onChange={handleAlertWindowChange}
          min={1}
          max={30}
          disabled={!settings!.notificationsEnabled}
          label="Alert Window"
          helperText="We'll notify you this many days before an item expires"
        />
      </div>

      {/* Data Section */}
      <h2 className="settings-section-label">
        Data
      </h2>
      <div className="settings-card settings-card-stack-sm">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="settings-row"
        >
          <Download size={20} />
          {exporting ? 'Exporting...' : 'Export as JSON'}
        </button>
        <button
          onClick={() => setShowClearDialog(true)}
          className="settings-row settings-row-danger"
        >
          <Trash2 size={20} />
          Delete Everything
        </button>
      </div>

      {/* Appearance Section */}
      <h2 className="settings-section-label">
        Appearance
      </h2>
      <div className="settings-card">
        <button
          onClick={handleThemeCycle}
          className="settings-row"
        >
          {THEME_ICON[settings!.theme]}
          <span>Theme: {THEME_LABEL[settings!.theme]}</span>
        </button>
      </div>

      {/* About Section */}
      <h2 className="settings-section-label">
        About
      </h2>
      <div className="settings-card settings-card-stack-sm">
        <div className="settings-info-header">
          <Info size={20} className="text-muted" />
          <div>
            <div className="settings-info-name">
              Barcode Inventory
            </div>
            <div className="settings-info-version">
              Version 1.0.0
            </div>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="settings-info-row"
        >
          <ExternalLink size={20} />
          View on GitHub
        </a>
      </div>

      {/* Clear data confirmation dialog */}
      <ConfirmDialog
        open={showClearDialog}
        title="Delete all inventory data?"
        body="This will permanently remove all products and batches. This cannot be undone."
        confirmLabel="Delete Everything"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearDialog(false)}
      />

      {/* Toast notifications */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
