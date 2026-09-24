/** The approved ribbon mark. Keep the supplied artwork intact in every lockup. */
export default function BrandMark({size=40,className=""}:{size?:number;className?:string}) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/dormscape-mark.png" alt="" width={size} height={size} className={className} style={{width:size,height:size,objectFit:"contain",flexShrink:0,borderRadius:Math.round(size*.18)}}/>;
}
