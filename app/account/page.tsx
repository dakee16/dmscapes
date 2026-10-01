import { redirect } from "next/navigation";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ upgraded?: string }> }) {
  const { upgraded } = await searchParams;
  redirect(upgraded === "plus" || upgraded === "pro" ? `/rooms?upgraded=${upgraded}` : "/rooms");
}
