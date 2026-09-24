import { BRAND_MARK_URL } from "@/lib/brand-image";

/** The approved folded-room mark, derived from the supplied original artwork. */
export default function BrandMark({size=40,className=""}:{size?:number;className?:string}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={BRAND_MARK_URL} alt="" width={size} height={size} className={className} style={{width:size,height:size,objectFit:"contain",flexShrink:0,borderRadius:Math.round(size*.18)}}/>;
}
