"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, type HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { useExperienceMotion } from "@/components/experience/MotionProvider";

// One stack owns scroll locking and keyboard focus, even when dialogs overlap.
const dialogs: HTMLElement[] = [];
let bodyOverflow = "";
let bodyPadding = "";

const Modal = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Modal(
  { children, className = "", ...props }, forwardedRef
) {
  const { paused } = useExperienceMotion();
  const root = useRef<HTMLDivElement>(null);
  const returnFocus = useRef(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement : null
  );
  useImperativeHandle(forwardedRef, () => root.current!);

  useEffect(() => {
    const dialog = root.current;
    if (!dialog) return;
    if (!dialogs.length) {
      bodyOverflow = document.body.style.overflow;
      bodyPadding = document.body.style.paddingRight;
      const scrollbar = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbar > 0) {
        document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
      }
      document.body.style.overflow = "hidden";
    }
    dialogs.push(dialog);
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'a[href], button, input, textarea, select, [tabindex]'
    )).filter(el => el.tabIndex >= 0 && !el.matches(':disabled') &&
      !el.closest('[inert], [aria-hidden="true"]') && el.getClientRects().length > 0);
    const focusFirst = () => (focusable()[0] ?? dialog).focus({ preventScroll: true });
    if (!dialog.contains(document.activeElement)) focusFirst();
    const onKey = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== dialog || event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first || !last) { event.preventDefault(); dialog.focus(); return; }
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (active === last || active === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    const onFocus = (event: FocusEvent) => {
      if (dialogs.at(-1) === dialog && !dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      const wasTop = dialogs.at(-1) === dialog;
      dialogs.splice(dialogs.indexOf(dialog), 1);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
      if (!dialogs.length) {
        document.body.style.overflow = bodyOverflow;
        document.body.style.paddingRight = bodyPadding;
      }
      if (wasTop && returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
    };
  }, []);

  if (typeof document === "undefined") return null;
  return createPortal(
    <div {...props} ref={root} role="dialog" aria-modal="true" tabIndex={-1}
      data-motion={paused ? "paused" : "on"}
      className={`dm-dialog-layer ${className}`}>
      {children}
    </div>, document.body
  );
});

export default Modal;
