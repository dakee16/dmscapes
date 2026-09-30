"use client";
import type { FurnitureItem, Product, SelectedRoom, StyleId } from "@/lib/types";
import type { SavedEditorState } from "@/lib/studio-save";
import SharedRoomStudio from "@/components/studio/SharedRoomStudio";
import ProductImage from "@/components/products/ProductImage";
import s from "./Workspace.module.css";
import { useWorkspace } from "./WorkspaceContext";

export default function ReadOnlyRoom({ room, items, style, products, editor, canComment }: {
  room: SelectedRoom; items: FurnitureItem[]; style: StyleId; products: Product[];
  editor?: SavedEditorState; canComment: boolean;
}) {
  const workspace=useWorkspace();
  return <><div className={s.readOnlyRoom}>
    <SharedRoomStudio room={room} items={items} style={style} products={products} editor={editor}/>
    <aside className={s.readOnlyShop} aria-label="Shopping list">
      <header><p className={s.eyebrow}>Your room, shoppable</p><h2>Shopping list</h2><p>{products.length} picks · ${products.reduce((sum,p)=>sum+p.price,0).toFixed(2)}</p></header>
      {products.map(p=><a key={p.id} href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored" className={s.readOnlyProduct}><ProductImage src={p.image_url}/><span><strong>{p.name}</strong><small>${p.price.toFixed(2)} · View product ↗</small></span></a>)}
      {!products.length&&<p className={s.muted}>The shopping list is waiting for its first pick.</p>}
      <p className={s.muted}>Prices can change at checkout. Dormscape may earn from qualifying purchases.</p>
      {canComment&&<button className={s.secondary} onClick={()=>workspace?.commentOn?.("room")}>Discuss the shopping list</button>}
    </aside>
  </div><p className={s.notice}>{canComment?"Explore the room and open Comments to leave feedback. In 2D, click a piece to leave a note. Ask the owner for editing access to change the layout or shopping list.":"You can view this room. Shared editing and comments return when the host has Pro."}</p></>;
}
