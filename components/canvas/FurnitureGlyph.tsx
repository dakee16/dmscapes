import { Group, Rect, Line, Circle, Ellipse } from "react-konva";
import type { FurnitureItem } from "@/lib/types";
import { isBunkBed } from "@/lib/bedding";

/** Top-down symbols inside the real footprint. These never change hit areas. */
export default function FurnitureGlyph({ item, scale, color }: { item: FurnitureItem; scale: number; color: string }) {
  const w = item.width_ft * scale, h = item.length_ft * scale;
  const pad = Math.min(w, h) * .06;
  const ink = "#17172b";
  const surface = "#fafaf8";
  let art;
  switch (item.type) {
    case "bed":
      art = <><Rect width={w} height={h} fill="#c8aa88" cornerRadius={3} /><Rect x={pad} y={pad} width={w-pad*2} height={h-pad*2} fill={surface} cornerRadius={5} /><Rect x={pad} y={h*.32} width={w-pad*2} height={h*.59} fill={color} opacity={.75} cornerRadius={2} /><Rect x={w*.13} y={h*.07} width={w*.74} height={h*.19} fill="white" stroke="#17172b20" strokeWidth={.8} cornerRadius={Math.min(8,w*.1)} /><Line points={[pad,h*.4,w-pad,h*.4]} stroke="white" opacity={.45} strokeWidth={3} /><Rect x={pad} y={h*.8} width={w-pad*2} height={h*.11} fill="#e6dbc6" opacity={.8} /></>;
      break;
    case "desk":
      art = <><Rect width={w} height={h} cornerRadius={2} fill="#d5bb99" /><Line points={[w*.06,h*.2,w*.94,h*.2]} stroke="#aa8a63" opacity={.35} /><Rect x={w*.22} y={h*.16} width={w*.56} height={h*.47} fill={ink} cornerRadius={2} /><Rect x={w*.26} y={h*.2} width={w*.48} height={h*.34} fill="#aab9f3" /><Rect x={w*.2} y={h*.66} width={w*.6} height={h*.11} fill="#f4f2ed" cornerRadius={1} /><Circle x={w*.87} y={h*.75} radius={Math.min(w,h)*.06} fill="#fafaf8" /></>;
      break;
    case "desk_chair": case "chair": case "lounge":
      art = <><Rect x={w*.06} y={h*.02} width={w*.88} height={h*.26} fill="#8a9d97" cornerRadius={4} /><Rect x={w*.13} y={h*.25} width={w*.74} height={h*.63} fill="#b3c3bb" cornerRadius={6} /><Line points={[w*.08,h*.32,w*.08,h*.76]} stroke={ink} strokeWidth={2} /><Line points={[w*.92,h*.32,w*.92,h*.76]} stroke={ink} strokeWidth={2} /></>;
      break;
    case "dresser": case "storage_bins": case "shelf": case "wardrobe": case "storage":
      art = <><Rect width={w} height={h} fill={item.type === "dresser" ? "#cfb18b" : "#dce0d8"} cornerRadius={2} />{[1,2].map(i=><Group key={i}><Line points={[pad,h*i/3,w-pad,h*i/3]} stroke="#17172b30" /><Line points={[w*.38,h*(i-.5)/3,w*.62,h*(i-.5)/3]} stroke="#17172b66" strokeWidth={1.5} /></Group>)}</>;
      break;
    case "rug":
      art = <><Rect width={w} height={h} fill="#e9dfce" /><Rect x={pad} y={pad} width={w-pad*2} height={h-pad*2} stroke={color} opacity={.6} strokeWidth={2} />{Array.from({length:7},(_,i)=><Line key={i} points={[pad,h*(i+1)/8,w-pad,h*(i+1)/8]} stroke={color} opacity={.13} />)}</>;
      break;
    case "sofa":
      art=<><Rect width={w} height={h} fill="#8fa7a1" cornerRadius={4}/><Rect x={pad} y={h*.25} width={w/2-pad*1.5} height={h*.66} fill="#c5d3cf" cornerRadius={3}/><Rect x={w/2+pad/2} y={h*.25} width={w/2-pad*1.5} height={h*.66} fill="#c5d3cf" cornerRadius={3}/></>;break;
    case "fridge": case "microwave":
      art=<><Rect width={w} height={h} fill="#d2d9e4" cornerRadius={2}/><Rect x={pad} y={pad} width={w-pad*2} height={h-pad*2} fill="#ecf0f6"/><Line points={[w*.15,h*.88,w*.65,h*.88]} stroke={ink} strokeWidth={2}/></>;break;
    case "radiator": case "column":
      art=<><Rect width={w} height={h} fill="#d0d5de"/>{Array.from({length:6},(_,i)=><Line key={i} points={[w*(i+1)/7,pad,w*(i+1)/7,h-pad]} stroke="#828b9d" strokeWidth={1}/>)}</>;break;
    case "desk_lamp":
      art = <><Ellipse x={w/2} y={h/2} radiusX={w*.45} radiusY={h*.45} fill="#ffe392" stroke="#b49b5c" strokeWidth={.8} /><Circle x={w/2} y={h/2} radius={Math.min(w,h)*.2} fill="#fff7d4" /></>;
      break;
    case "throw_pillows":
      art = <><Rect width={w} height={h} fill="#ebd0aa" cornerRadius={Math.min(w,h)*.24} /><Rect x={pad} y={pad} width={w-pad*2} height={h-pad*2} stroke="#b8997566" cornerRadius={Math.min(w,h)*.22} /></>;
      break;
    case "laundry_hamper": case "trash_can":
      art = <><Rect width={w} height={h} cornerRadius={Math.min(w,h)*.23} fill="#ccd5cd" /><Rect x={w*.2} y={h*.2} width={w*.6} height={h*.6} stroke="#17172b40" cornerRadius={Math.min(w,h)*.15} /></>;
      break;
    case "mirror": case "wall_decor":
      art = <><Rect width={w} height={h} fill="#b69774" /><Rect x={pad} y={pad} width={w-pad*2} height={h-pad*2} fill={item.type === "mirror" ? "#cedde7" : "#e4ce9b"} /><Line points={[w*.18,h*.8,w*.8,h*.15]} stroke="white" opacity={.65} /></>;
      break;
    case "string_lights":
      art = <><Line points={[0,h/2,w,h/2]} stroke="#b79c58" strokeWidth={1.3} />{Array.from({length:9},(_,i)=><Circle key={i} x={(i+.5)*w/9} y={h/2} radius={Math.max(1.4,Math.min(3,h/2))} fill="#ffd84d" />)}</>;
      break;
    default:
      art = <Rect width={w} height={h} fill={color} opacity={.45} cornerRadius={2} />;
  }
  return <Group listening={false}>{art}{(isBunkBed(item)||item.bed_mode==="lofted") && <>
    <Rect x={w*.04} y={h*.03} width={w*.92} height={h*.94} stroke={ink} strokeWidth={1.6} dash={[5,3]} cornerRadius={2}/>
    <Rect x={w*.72} y={h*.68} width={w*.22} height={h*.29} fill="#b99263" stroke={ink} strokeWidth={.7}/>
    {[1,2,3].map(i=><Line key={i} points={[w*.74,h*(.68+i*.07),w*.92,h*(.68+i*.07)]} stroke={surface} strokeWidth={2}/>)}
  </>}</Group>;
}
