"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import CopyButton from "@/components/growth/CopyButton";

/**
 * "Embed this chart": copies the chart's HTML (an image that links back, and a
 * "Source: dormscape" line), then shows that code, selected when the clipboard
 * refused, so it can always be copied by hand. `preview` shows the chart first
 * where the page doesn't draw it.
 */
export default function EmbedChart({
  snippet,
  label = "Embed this chart",
  preview,
}: {
  snippet: string;
  label?: string;
  preview?: { src: string; alt: string; width: number; height: number };
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const code = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (state === "failed") code.current?.select();
  }, [state]);

  return (
    <div style={{ marginTop: 28, maxWidth: 640 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 16px" }}>
        <CopyButton
          text={snippet}
          label={label}
          className="ds-btn ds-btn--ghost-ink ds-btn--sm"
          onCopied={() => setState("copied")}
          onFailed={() => setState("failed")}
        />
        <p role="status" style={{ margin: 0, fontSize: 14, lineHeight: 1.4, color: "var(--ds-caption)" }}>
          {state === "copied"
            ? "Copied. Paste it into your page, post or doc."
            : state === "failed"
              ? "Couldn't copy. Select the code below and copy it."
              : ""}
        </p>
      </div>
      {state !== "idle" && (
        <>
          {preview && (
            <Image
              src={preview.src}
              alt={preview.alt}
              width={preview.width}
              height={preview.height}
              sizes="(max-width: 700px) 100vw, 640px"
              style={{ display: "block", width: "100%", height: "auto", marginTop: 16, borderRadius: 12, border: "1.5px solid var(--ds-line)" }}
            />
          )}
          <textarea
            ref={code}
            readOnly
            value={snippet}
            rows={6}
            aria-label="Embed code"
            onFocus={(e) => e.currentTarget.select()}
            style={{
              display: "block",
              width: "100%",
              marginTop: 16,
              padding: 12,
              border: "1.5px solid var(--ds-line)",
              borderRadius: 12,
              background: "#fff",
              color: "var(--ds-ink)",
              font: "12px/1.5 var(--ds-mono)",
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </>
      )}
    </div>
  );
}
