const TOAST_ICONS = {
  success: "ti ti-circle-check",
  error: "ti ti-alert-circle",
  warning: "ti ti-alert-triangle",
  info: "ti ti-info-circle",
};

export default function ToastContainer({ toasts = [], onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div className="toast-container" role="region" aria-label="Notificações">
      {toasts.map((toast) => {
        const type = toast.type || "info";
        const isInventory = Boolean(toast.undoItem);

        return (
          <div key={toast.id} className={`toast toast-${type}`}>
            <i className={TOAST_ICONS[type] || TOAST_ICONS.info} aria-hidden="true" />
            <div className="toast-body">
              <span className="toast-text">{toast.text}</span>
              {isInventory ? (
                <span className="toast-hint">X remove do inventário</span>
              ) : null}
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss?.(toast)}
              aria-label={isInventory ? "Remover item do inventário e fechar" : "Fechar notificação"}
            >
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
