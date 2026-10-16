import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, Info, Moon, Sun, Monitor, ExternalLink, AlertTriangle, HelpCircle, LogOut, KeyRound } from 'lucide-react';
import type { Product, Batch } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { requestPermission, getPermissionStatus } from '@/services/notificationService';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';
import { getAllProducts } from '@/services/catalogService';
import { getAllBatches } from '@/services/inventoryService';
import { getDB } from '@/db/database';
import { SettingsToggle } from '@/components/SettingsToggle';
import { SettingsStepper } from '@/components/SettingsStepper';
import { SyncSettings } from '@/components/SyncSettings';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';

type ThemeOption = 'auto' | 'light' | 'dark';

const THEME_CYCLE: Record<ThemeOption, ThemeOption> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
};

const THEME_ICON: Record<ThemeOption, React.ReactNode> = {
  auto: <Monitor size={18} aria-hidden="true" />,
  light: <Sun size={18} aria-hidden="true" />,
  dark: <Moon size={18} aria-hidden="true" />,
};

const THEME_LABEL: Record<ThemeOption, string> = {
  auto: 'Auto',
  light: 'Light',
  dark: 'Dark',
};

export function SettingsScreen() {
  const navigate = useNavigate();
  const { reopen } = useTutorial();
  const { settings, updateSettings } = useSettings();
  const { toasts, showToast, dismissToast } = useToast();
  const { logout, setMasterPassword } = useAuth();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');

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
      await db.clear('sales');
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

  // Handle replay tutorial
  const handleReplayTutorial = useCallback(() => {
    reopen();
    navigate('/');
  }, [reopen, navigate]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Handle master password save
  const handleSaveMasterPassword = useCallback(() => {
    setMasterPassword(masterPasswordInput);
    showToast('success', 'Master password updated');
    setMasterPasswordInput('');
  }, [setMasterPassword, masterPasswordInput, showToast]);

  // Read permission status once via a lazy state initializer — no effect, no
  // re-read on every render, and no one-frame flash of null on mount.
  const [permissionStatus] = useState<NotificationPermission>(() => getPermissionStatus());

  const permissionDenied = settings?.notificationsEnabled && permissionStatus === 'denied';
  return (
    <div className="settings-screen">
      {/* Header */}
      <h1 className="settings-header">
        Settings
      </h1>

      {/* Notifications Section */}
      <h2 className="settings-section-label">
        Notifications
      </h2>
      <div className="settings-card settings-card-stack">
        <SettingsToggle
          enabled={settings.notificationsEnabled}
          onChange={handleNotificationToggle}
          label="Push Notifications"
          description="Get notified when items are about to expire"
        />
        {permissionDenied && (
          <div className="settings-warning">
            <AlertTriangle size={16} aria-hidden="true" />
            Notifications blocked by browser
          </div>
        )}
        <SettingsStepper
          value={settings.alertWindowDays}
          onChange={handleAlertWindowChange}
          min={1}
          max={30}
          disabled={!settings.notificationsEnabled}
          label="Alert Window"
          helperText="We'll notify you this many days before an item expires"
        />
      </div>

      {/* Scanner Section */}
      <h2 className="settings-section-label">
        Scanner
      </h2>
      <div className="settings-card settings-card-stack">
        <SettingsToggle
          enabled={settings.cashierMode}
          onChange={(enabled) => updateSettings({ cashierMode: enabled })}
          label="Cashier Mode"
          description="Scan a customer's items straight into the till, take payment, and track the day's sales"
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
          <Download size={20} aria-hidden="true" />
          {exporting ? 'Exporting...' : 'Export as JSON'}
        </button>
        <button
          onClick={() => setShowClearDialog(true)}
          className="settings-row settings-row-danger"
        >
          <Trash2 size={20} aria-hidden="true" />
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
          {THEME_ICON[settings.theme]}
          <span>Theme: {THEME_LABEL[settings.theme]}</span>
        </button>
      </div>

      {/* About Section */}
      <h2 className="settings-section-label">
        About
      </h2>
      <div className="settings-card settings-card-stack-sm">
        <div className="settings-info-header">
          <Info size={20} className="text-muted" aria-hidden="true" />
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
          href="https://github.com/dcyngraphics-glitch/barcode-inventory"
          target="_blank"
          rel="noopener noreferrer"
          className="settings-info-row"
        >
          <ExternalLink size={20} aria-hidden="true" />
          View on GitHub
        </a>
        <a
          href="https://github.com/dcyngraphics-glitch/barcode-inventory#license"
          target="_blank"
          rel="noopener noreferrer"
          className="settings-info-row"
        >
          <ExternalLink size={20} aria-hidden="true" />
          Licenses
        </a>
        <button
          onClick={handleReplayTutorial}
          className="settings-row"
        >
          <HelpCircle size={20} aria-hidden="true" />
          Replay Tutorial
        </button>
      </div>

      {/* Sync Section */}
      <h2 className="settings-section-label">
        Sync
      </h2>
      <div className="settings-card settings-card-stack">
        <SyncSettings />
      </div>

      {/* Security Section */}
      <h2 className="settings-section-label">
        Security
      </h2>
      <div className="settings-card settings-card-stack">
        <button
          onClick={handleLogout}
          className="settings-row settings-row-danger"
        >
          <LogOut size={20} aria-hidden="true" />
          Log Out
        </button>
        <div className="settings-row">
          <KeyRound size={20} aria-hidden="true" />
          <label htmlFor="master-password-input" className="settings-field-label">
            Master Password
          </label>
          <input
            id="master-password-input"
            type="password"
            value={masterPasswordInput}
            onChange={(e) => setMasterPasswordInput(e.target.value)}
            placeholder="Enter new master password"
            className="settings-input"
          />
        </div>
        <button
          onClick={handleSaveMasterPassword}
          disabled={!masterPasswordInput}
          className="settings-row"
        >
          Save Master Password
        </button>
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
