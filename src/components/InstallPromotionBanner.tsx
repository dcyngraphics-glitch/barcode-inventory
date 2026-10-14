import { FC } from 'react';

interface InstallPromotionBannerProps {
  visible: boolean;
  onInstall: () => void;
  onClose: () => void;
}

export const InstallPromotionBanner: FC<InstallPromotionBannerProps> = ({
  visible,
  onInstall,
  onClose,
}) => {
  if (!visible) {
    return null;
  }

  return (
    <div className="install-banner" role="banner" aria-label="Install app">
      <div className="install-banner-content">
        <div className="install-banner-info">
          <h3 className="install-banner-title">Install the app</h3>
          <p className="install-banner-description">
            Get faster access and offline capabilities by installing the app
            on your home screen.
          </p>
        </div>
        <div className="install-banner-actions">
          <button className="install-banner-button install-banner-button-close" onClick={onClose}>
            Close
          </button>
          <button className="install-banner-button install-banner-button-install" onClick={onInstall}>
            Install
          </button>
        </div>
      </div>
    </div>
  );
};