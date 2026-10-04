import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import MyRoomHome from "@/components/my-room/MyRoomHome";

export const metadata: Metadata = {
  title: "My Room",
  description: "A shared dorm room for you and your roommates: split the room, settle who brings what, and plan it together on a call. Included with Dormscape Pro.",
  alternates: { canonical: "/my-room" },
  robots: { index: false, follow: true },
};

export default function MyRoomPage() {
  return (
    <PageShell navOverlay>
      <MyRoomHome />
    </PageShell>
  );
}
