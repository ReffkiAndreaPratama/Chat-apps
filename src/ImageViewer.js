import { useEffect, useCallback } from "react";

/**
 * Full-screen image viewer overlay.
 * Supports keyboard navigation (Escape to close).
 */
export default function ImageViewer({ src, onClose }) {
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  if (!src) return null;

  return (
    <div className="image-viewer" onClick={onClose} role="dialog" aria-label="Image viewer">
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 10,
        }}
      >
        <div style={{ color: "white", fontSize: 14, opacity: 0.8 }}>
          Klik di mana saja untuk menutup
        </div>
        <button className="image-viewer-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <img
        src={src}
        alt="Full size"
        onClick={(e) => e.stopPropagation()}
        style={{ cursor: "zoom-out" }}
      />

      {/* Download button */}
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 20,
          textDecoration: "none",
          transition: "background 150ms",
        }}
        title="Download"
      >
        ⬇
      </a>
    </div>
  );
}
