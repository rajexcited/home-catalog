"use client";

import { useEffect, useId, useRef, useState } from "react";
import styles from "./info-tooltip.module.css";

interface InfoTooltipProps {
  tooltipText: string;
}

export function InfoTooltip({ tooltipText }: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const tooltipRef = useRef<HTMLSpanElement>(null);

  if (!tooltipText) {
    throw new Error("tooltipText is required for InfoTooltip");
  }

  useEffect(() => {
    if (!open) return;

    const dismissOnOutsideClick = (event: PointerEvent) => {
      if (!tooltipRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", dismissOnOutsideClick);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsideClick);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  return (
    <span ref={tooltipRef} className={styles.infoTooltip} data-open={open}>
      <button
        type="button"
        className={styles.infoButton}
        aria-label={`Info: ${tooltipText}`}
        aria-describedby={tooltipId}
        aria-expanded={open}
        aria-controls={tooltipId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.infoGlyph} aria-hidden="true">
          i
        </span>
      </button>
      <span id={tooltipId} role="tooltip" className={styles.infoPopup}>
        {tooltipText}
      </span>
    </span>
  );
}
