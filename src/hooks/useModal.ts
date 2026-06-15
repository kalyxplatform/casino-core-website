"use client";

import { RefObject, useEffect, useRef } from "react";
import { useFocusTrap } from "./useFocusTrap";

export type ModalDialogProps<T extends HTMLElement> = {
  ref:               RefObject<T | null>;
  role:              "dialog";
  "aria-modal":      boolean;
  "aria-labelledby"?: string;
  "aria-label"?:      string;
};

/**
 * Modal essentials in one hook: body scroll lock (saved/restored),
 * Escape-to-close, focus trap with focus restoration, plus the dialog
 * ARIA attributes. Spread the returned bag onto the dialog element.
 *
 * ```tsx
 * const dialogProps = useModal(open, onClose, { labelledBy: "my-title" });
 * <div {...dialogProps} className="…">…</div>
 * ```
 */
export function useModal<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose: () => void,
  opts: { labelledBy?: string; ariaLabel?: string } = {},
): ModalDialogProps<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useFocusTrap(open, ref);

  return {
    ref,
    role:              "dialog",
    "aria-modal":      open,
    "aria-labelledby": opts.labelledBy,
    "aria-label":      opts.ariaLabel,
  };
}
