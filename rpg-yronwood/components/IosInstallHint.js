import { useEffect, useState } from "react";

const STORAGE_KEY = "rpg-ios-install-dismissed";

function isIphone() {
  if (typeof navigator === "undefined") return false;
  return /iPhone/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.navigator.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export default function IosInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIphone() || isStandalone()) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      /* private mode */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <aside className="ios-install-hint" role="note">
      <button
        type="button"
        className="ios-install-hint-dismiss"
        onClick={dismiss}
        aria-label="Dispensar dica de instalação"
      >
        ✕
      </button>
      <strong className="ios-install-hint-title">Instalar no iPhone</strong>
      <p>
        Abra este site no Safari. Toque em Compartilhar e depois em Adicionar à Tela de Início.
      </p>
    </aside>
  );
}
