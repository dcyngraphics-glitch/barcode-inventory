import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, Info, Moon, Sun, Monitor, ExternalLink, AlertTriangle } from 'lucide-react';
import type { Settings, Product, Batch } from '@/types';
import { SETTINGS_ID } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';
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
  const [settings, setSettings] = useState<Settings>({
    id: SETTINGS_ID,
    alertWindowDays: 3,
    notificationsEnabled: false,
    theme: 'auto',
  });
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { toasts, showToast, dismissToast } = useToast();

  // Load settings on mount
  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        showToast('error', 'Failed to load settings');
      })
      .finally(() => setLoading(false));
  }, [showToast]);

  // Handle notification toggle
  const handleNotificationToggle = useCallback(
    async (enabled: boolean) => {
      if (enabled) {
        const permission = await requestPermission();
        if (permission === 'granted') {
          setSettings((prev) => {
            const updated = { ...prev, notificationsEnabled: true };
            saveSettings(updated).catch((err) => {
              console.error('Failed to save settings:', err);
            });
            return updated;
          });
        } else {
          showToast('error', 'Notifications blocked by browser');
          setSettings((prev) => {
            const updated = { ...prev, notificationsEnabled: false };
            saveSettings(updated).catch((err) => {
              console.error('Failed to save settings:', err);
            });
            return updated;
          });
        }
      } else {
        setSettings((prev) => {
          const updated = { ...prev, notificationsEnabled: false };
          saveSettings(updated).catch((err) => {
            console.error('Failed to save settings:', err);
          });
          return updated;
        });
      }
    },
    [showToast]
  );

  // Handle alert window change
  const handleAlertWindowChange = useCallback(
    (days: number) => {
      setSettings((prev) => {
        const updated = { ...prev, alertWindowDays: days };
        saveSettings(updated).catch((err) => {
          console.error('Failed to save settings:', err);
        });
        return updated;
      });
    },
    []
  );

  // Handle theme cycle
  const handleThemeCycle = useCallback(() => {
    setSettings((prev) => {
      const nextTheme = THEME_CYCLE[prev.theme];
      const updated = { ...prev, theme: nextTheme };
      saveSettings(updated).catch((err) => {
        console.error('Failed to save settings:', err);
      });
      return updated;
    });
  }, []);

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

  // Handle clear all data
  const handleClearAll = useCallback(async () => {
    try {
      const db = await getDB();
      await db.clear('catalog');
      await db.clear('inventory');
      setShowClearDialog(false);
      showToast('success', 'All data cleared');
    } catch (err) {
      console.error('Failed to clear data:', err);
      showToast('error', 'Failed to clear data');
      setShowClearDialog(false);
    }
  }, [showToast]);

  if (loading) {
    return (
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              height: '28px',
              width: '120px',
              background: '#f2f3f4',
              borderRadius: '8px',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              height: '80px',
              background: '#f2f3f4',
              borderRadius: '12px',
              marginBottom: '12px',
              animation: 'shimmer 1.5s infinite',
            }}
          />
        ))}
        <style>{`
          @keyframes shimmer {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  const permissionDenied =
    settings.notificationsEnabled && getPermissionStatus() === 'denied';

  return (
    <div
      style={{
        padding: '16px',
        paddingBottom: 'calc(16px + 64px + env(safe-area-inset-bottom))',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: '24px',
        }}
      >
        Settings
      </div>

      {/* Notifications Section */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}
      >
        Notifications
      </div>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e6e8ea',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <SettingsToggle
          enabled={settings.notificationsEnabled}
          onChange={handleNotificationToggle}
          label="Push Notifications"
          description="Get notified when items are about to expire"
        />
        {permissionDenied && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              background: '#fef2f2',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#dc2626',
            }}
          >
            <AlertTriangle size={16} />
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

      {/* Data Section */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}
      >
        Data
      </div>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e6e8ea',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <button
          onClick={handleExport}
          disabled={exporting}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid #e6e8ea',
            borderRadius: '8px',
            cursor: exporting ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 500,
            color: '#334155',
            opacity: exporting ? 0.6 : 1,
            transition: 'opacity 200ms ease',
            minHeight: '44px',
          }}
        >
          <Download size={20} />
          {exporting ? 'Exporting...' : 'Export as JSON'}
        </button>
        <button
          onClick={() => setShowClearDialog(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid #dc2626',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 500,
            color: '#dc2626',
            transition: 'opacity 200ms ease',
            minHeight: '44px',
          }}
        >
          <Trash2 size={20} />
          Delete Everything
        </button>
      </div>

      {/* Appearance Section */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}
      >
        Appearance
      </div>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e6e8ea',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={handleThemeCycle}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid #e6e8ea',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 500,
            color: '#334155',
            transition: 'opacity 200ms ease',
            minHeight: '44px',
            width: '100%',
          }}
        >
          {THEME_ICON[settings.theme]}
          <span>Theme: {THEME_LABEL[settings.theme]}</span>
        </button>
      </div>

      {/* About Section */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '12px',
        }}
      >
        About
      </div>
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid #e6e8ea',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Info size={20} color="#475569" />
          <div>
            <div
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              Barcode Inventory
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#475569',
              }}
            >
              Version 1.0.0
            </div>
          </div>
        </div>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'transparent',
            border: '1px solid #e6e8ea',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            color: '#334155',
            textDecoration: 'none',
            transition: 'opacity 200ms ease',
            minHeight: '44px',
          }}
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
