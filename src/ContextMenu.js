import { useEffect, useRef } from "react";

/**
 * Reusable context menu component.
 * Automatically positions itself within viewport bounds.
 */
export default function ContextMenu({ x, y, items, onClose, header }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - (items.length * 44 + 60));

  return (
    <div className="context-menu-overlay" onClick={onClose}>
      <div
        ref={menuRef}
        className="context-menu"
        style={{ top: adjustedY, left: adjustedX }}
        onClick={(e) => e.stopPropagation()}
        role="menu"
      >
        {header && (
          <>
            {header}
            <div className="context-menu-divider" />
          </>
        )}

        {items.map((item, i) => {
          if (item.divider) {
            return <div key={i} className="context-menu-divider" />;
          }

          if (!item.show && item.show !== undefined) return null;

          return (
            <button
              key={i}
              className={`context-menu-item ${item.danger ? "danger" : ""}`}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              role="menuitem"
            >
              {item.icon && <span className="menu-icon">{item.icon}</span>}
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
