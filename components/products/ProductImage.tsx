"use client";
import { useState, type ImgHTMLAttributes } from "react";

/** Keep retailer image failures from leaving broken icons in the shopping list. */
export default function ProductImage({ src, alt = "", ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState<ImgHTMLAttributes<HTMLImageElement>["src"]>();
  const fallback = "/product-placeholder.svg";
  return <img {...props} src={!src || failed === src ? fallback : src} alt={alt} loading={props.loading ?? "lazy"} onError={() => setFailed(src)}/>;
}
