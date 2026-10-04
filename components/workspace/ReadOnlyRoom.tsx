"use client";
import type { FurnitureItem, Product, SelectedRoom, StyleId } from "@/lib/types";
import type { SavedEditorState } from "@/lib/studio-save";
import SharedRoomStudio from "@/components/studio/SharedRoomStudio";
import ProductImage from "@/components/products/ProductImage";
import { ArrowUpRight } from "@/components/ds/Icons";
import s from "./Room.module.css";
import { useWorkspace } from "./WorkspaceContext";
import { money } from "./people";

/** What commenters (and members of a room whose host left Pro) see: the room and its list, read only. */
export default function ReadOnlyRoom({ room, items, style, products, editor, canComment }: {
  room: SelectedRoom; items: FurnitureItem[]; style: StyleId; products: Product[];
  editor?: SavedEditorState; canComment: boolean;
}) {
  const workspace=useWorkspace();
  return <div className={s.readOnly}>
    <p className={s.readOnlyNote}>{canComment?"Explore the room and leave comments. In 2D, select a piece to leave a note on it. Ask the host for editing access to change the layout or shopping list.":"You can view this room. Shared editing and comments return when the host has Pro."}</p>
    <div className={s.readOnlyGrid}>
      <SharedRoomStudio room={room} items={items} style={style} products={products} editor={editor}/>
      <aside className={s.readOnlyShop} aria-label="Shopping list">
        <header><p className={s.railLabel}>Your room, shoppable</p><h2>Shopping list</h2><p>{products.length} picks · {money(Math.round(products.reduce((sum,p)=>sum+p.price,0)*100)/100)}</p></header>
        <ul>{products.map(p=><li key={p.id}><a href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored" className={s.readOnlyProduct}><ProductImage src={p.image_url}/><span><strong>{p.name}</strong><small>{money(p.price)} · View product<ArrowUpRight size={11}/></small></span></a></li>)}</ul>
        {!products.length&&<p className={s.columnEmpty}>The shopping list is waiting for its first pick.</p>}
        <p className={s.readOnlyFine}>Prices can change at checkout. Dormscape may earn from qualifying purchases.</p>
        {canComment&&<button type="button" className={s.ghostBtn} onClick={()=>workspace?.commentOn?.("room")}>Discuss the shopping list</button>}
      </aside>
    </div>
  </div>;
}
