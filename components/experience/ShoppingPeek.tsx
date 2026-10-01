"use client";
import ProductImage from "@/components/products/ProductImage";
import Link from "next/link";
import { productsFor } from "@/lib/catalog";
import type { StyleId } from "@/lib/types";
import s from "./RoomJourney.module.css";
export default function ShoppingPeek({ vibe }: { vibe: string }) {
  const products = productsFor(vibe as StyleId, "mid", "twin_xl").slice(0,3);
  return <aside className={s.shopPeek} aria-label="Example shopping picks for this style"><header><span>The shopping list</span><i/></header>{products.map(p=><div className={s.peekItem} key={p.id}><ProductImage src={p.image_url}/><span>{p.name}</span><b>${p.price.toFixed(2)}</b></div>)}<Link href="/plan">Find your room&apos;s picks ↗</Link></aside>;
}
