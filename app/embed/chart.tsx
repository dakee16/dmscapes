import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { CHART_WIDTH, chartHeight, type Chart } from "@/lib/embed";
import { SITE_URL } from "@/lib/seo";

// The PNG behind "Embed this chart", in the site's type and colours. The
// routes are prerendered at build, so the fonts are only read there. They are
// static Latin subsets of app/fonts (same OFL licences): ImageResponse can't
// read woff2 or variable fonts.
const font = (file: string) => readFile(path.join(process.cwd(), "app/embed/fonts", file));

const INK = "#16161d";
const BLUE = "#2449ff";
const CAPTION = "#55555f";

export async function chartImage(c: Chart) {
  const [display, bold, regular, serif, mono] = await Promise.all(
    ["archivo-display.ttf", "archivo-800.ttf", "archivo-400.ttf", "fraunces-italic-400.ttf", "martian-mono-600.ttf"].map(font),
  );
  const max = Math.max(...c.rows.map((r) => r.sqft));
  const site = SITE_URL.replace(/^https?:\/\//, "");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px 44px",
          background: "#f4f3ee",
          color: INK,
          fontFamily: "Archivo",
        }}
      >
        <div style={{ fontFamily: "Martian Mono", fontSize: 17, color: BLUE }}>{c.eyebrow}</div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
          <div
            style={{ fontFamily: "Archivo Display", fontSize: 64, lineHeight: 1.05, letterSpacing: -1.9, textShadow: "-3px -2px 0 rgba(36, 73, 255, 0.4)" }}
          >
            {c.lines[0]}
          </div>
          <div style={{ fontFamily: "Fraunces", fontStyle: "italic", fontSize: 70, lineHeight: 1.05, letterSpacing: -0.7, color: BLUE }}>
            {c.lines[1]}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          {c.rows.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", height: 64 }}>
              <div style={{ display: "flex", flexDirection: "column", width: 480, paddingRight: 24 }}>
                <div style={{ fontWeight: 800, fontSize: 21, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.label}
                </div>
                <div style={{ fontSize: 16, color: CAPTION, marginTop: 2 }}>{r.dims}</div>
              </div>
              <div style={{ display: "flex", flex: 1 }}>
                <div style={{ width: `${(r.sqft / max) * 100}%`, height: 26, borderRadius: "0 5px 5px 0", background: BLUE }} />
              </div>
              <div style={{ width: 180, paddingLeft: 16, fontWeight: 800, fontSize: 20 }}>{r.value}</div>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginTop: "auto",
            paddingTop: 20,
            borderTop: "1.5px solid rgba(22, 22, 29, 0.14)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontFamily: "Martian Mono", fontSize: 16 }}>{`Source: dormscape · ${site}${c.page}`}</div>
            <div style={{ fontSize: 16, color: CAPTION, marginTop: 6 }}>{c.note}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", fontFamily: "Archivo Display", fontSize: 34, letterSpacing: -1 }}>
            dormscape
            <div style={{ width: 8, height: 8, marginLeft: 3, borderRadius: 999, background: BLUE }} />
          </div>
        </div>
      </div>
    ),
    {
      width: CHART_WIDTH,
      height: chartHeight(c.rows.length),
      fonts: [
        { name: "Archivo Display", data: display, weight: 800, style: "normal" },
        { name: "Archivo", data: bold, weight: 800, style: "normal" },
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Fraunces", data: serif, weight: 400, style: "italic" },
        { name: "Martian Mono", data: mono, weight: 600, style: "normal" },
      ],
    },
  );
}
