import { redirect } from "next/navigation";

// Creator links: dormscape.us/c/JANE opens the home page with JANE's code ready to
// claim (components/growth/CreatorCode). The code is checked when it's used.
export default async function CreatorLink({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/?creator=${encodeURIComponent(code.toLowerCase())}`);
}
