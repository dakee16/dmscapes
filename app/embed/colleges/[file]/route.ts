import { SCHOOLS, getSchool } from "@/lib/schools";
import { collegeChart } from "@/lib/embed";
import { chartImage } from "../../chart";

// /embed/colleges/<id>.png: each college page's size chart, built at deploy; any other name 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return SCHOOLS.filter((s) => collegeChart(s)).map((s) => ({ file: `${s.id}.png` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const school = file.endsWith(".png") ? getSchool(file.slice(0, -4)) : undefined;
  const chart = school && collegeChart(school);
  return chart ? chartImage(chart) : new Response("Not found", { status: 404 });
}
