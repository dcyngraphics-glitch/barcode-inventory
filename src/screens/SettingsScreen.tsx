import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, Info, ExternalLink, AlertTriangle, HelpCircle, LogOut, UserRound, Settings as SettingsIcon } from 'lucide-react';
import { SettingsToggle } from '@/components/SettingsToggle';
import { SettingsStepper } from '@/components/SettingsStepper';
import { AppModeSwitcher } from '@/components/AppModeSwitcher';
import type { Product, Batch } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { useSettings } from '@/hooks/useSettings';
import { requestPermission, getPermissionStatus } from '@/services/notificationService';
import { useTutorial } from '@/context/TutorialContext';
import { useAuth } from '@/context/AuthContext';
import { getAllProducts } from '@/services/catalogService';
import { getAllBatches } from '@/services/inventoryService';
import { getDB } from '@/db/database';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Toast, useToast } from '@/components/Toast';

type ThemeOption = 'auto' | 'light' | 'dark';

const THEMES: { value: ThemeOption; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

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
  const { cloudLogout } = useAuth();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  // Handle theme change (select one of auto / light / dark directly)
  const handleThemeChange = useCallback(
    (theme: ThemeOption) => {
      updateSettings({ theme });
    },
    [updateSettings]
  );

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
      // Dexie has no `db.clear(tableName)` — only `Table.prototype.clear`. The old
      // calls threw "db.clear is not a function", so Delete Everything silently
      // failed and only surfaced as the error toast below.
      await db.products.clear();
      await db.inventory.clear();
      await db.sales.clear();
      // Reset settings to defaults, keeping `catalogSeeded: false` so the 506-row
      // demo catalog is NOT re-inserted on the next launch. The user was told
      // "All data cleared", and then getting the whole catalog back would be
      // silently undone.
      const { ...settingsReset } = DEFAULT_SETTINGS;
      settingsReset.catalogSeeded = false;
      updateSettings(settingsReset);
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

  // Signing out is a real sign-out: Dexie Cloud clears the local database and re-syncs
  // as nobody, which is what makes handing the phone to someone else safe. If changes
  // have not synced yet the addon raises a confirmation through
  // db.cloud.userInteraction (rendered by UserInteractionPrompt) and rejects here when
  // the user backs out — a cancel, not a failure, so it is only logged.
  const handleLogout = useCallback(async () => {
    try {
      await cloudLogout();
    } catch (err) {
      console.error('Log out cancelled or failed:', err);
    }
  }, [cloudLogout]);

  // Read permission status once via a lazy state initializer — no effect, no
  // re-read on every render, and no one-frame flash of null on mount.
  const [permissionStatus] = useState<NotificationPermission>(() => getPermissionStatus());

  const permissionDenied = settings?.notificationsEnabled && permissionStatus === 'denied';

  return (
    <div className="settings-screen">
      {/* Header */}
      <header className="settings-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <SettingsIcon size={22} aria-hidden="true" />
          <h1 className="settings-header-title">Settings</h1>
        </div>
      </header>

      {/* Notifications Section */}
      <section className="settings-section">
        <h2 className="settings-section-label">Notifications</h2>
        <div className="settings-card settings-card-stack">
          <SettingsToggle
            enabled={settings.notificationsEnabled}
            onChange={handleNotificationToggle}
            label="Push Notifications"
            description="Get notified when items are about to expire"
          />
          {permissionDenied && (
            <div className="settings-warning">
              <AlertTriangle size={14} aria-hidden="true" />
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
      </section>

      {/* Mode Section — Shop (receive and stock) or Sell (ring up sales at the till).
          This reads ModeContext, not settings.cashierMode, so it is the live control. */}
      <section className="settings-section">
        <h2 className="settings-section-label">Mode</h2>
        <div className="settings-card">
          <AppModeSwitcher />
        </div>
      </section>

      {/* Theme Section — plain list, two columns never clash */}
      <section className="settings-section">
        <h2 className="settings-section-label">Theme</h2>
        <div className="settings-card">
          {THEMES.map(({ value: theme }) => (
            <button
              key={theme}
              type="button"
              onClick={() => handleThemeChange(theme)}
              className="settings-row"
              style={
                settings.theme === theme
                  ? {
                      backgroundColor: 'var(--color-accent-bg)',
                      borderColor: 'var(--color-accent)',
                      cursor: 'default',
                      transition: 'background-color 200ms ease, border-color 200ms ease',
                    }
                  : {}
              }
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: settings.theme === theme ? 'var(--color-accent)' : 'var(--color-muted)',
                  transition: 'background-color 200ms ease',
                }}
              />
              <span
                style={{
                  color: settings.theme === theme ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                  fontWeight: settings.theme === theme ? 600 : 500,
                  opacity: settings.theme === theme ? 1 : 0.75,
                }}
              >
                {THEME_LABEL[theme]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Data Section */}
      <section className="settings-section">
        <h2 className="settings-section-label">Data</h2>
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
      </section>

      {/* About Section */}
      <section className="settings-section">
        <h2 className="settings-section-label">About</h2>
        <div className="settings-card settings-card-stack-sm">
          <div className="settings-info-header">
            <Info size={20} className="text-muted" aria-hidden="true" />
            <div>
              <div className="settings-info-name">Barcode Inventory</div>
              <div className="settings-info-version">Version 1.0.0</div>
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
      </section>

      {/* Security Section — account indicator + sign out */}
      <section className="settings-section">
        <h2 className="settings-section-label">Security</h2>
        <div className="settings-card settings-card-stack-sm">
          <button
            onClick={handleLogout}
            className="settings-row settings-row-danger"
          >
            <LogOut size={20} aria-hidden="true" />
            Log Out
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <UserRound size={20} aria-hidden="true" />
            <div style={{ flex: 1 }}>
              <div className="settings-info-name">Signed in</div>
              <div className="settings-info-version">
                Your inventory syncs to this account on every device you sign in to.
              </div>
            </div>
          </div>
        </div>
      </section>

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
