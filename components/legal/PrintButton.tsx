"use client";

/** "Print this page" in the legal side column. */
export default function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.print()}>
      Print this page
    </button>
  );
}
