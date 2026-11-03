import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import MyRoomHome from "@/components/my-room/MyRoomHome";
import JsonLd from "@/components/site/JsonLd";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";

// Signed out, this is the landing page for My Room (a shared room for roommates, with Pro); signed in,
// the same page lists your designs. The HTML crawlers get is the landing page, so it is indexable.
export const metadata: Metadata = pageMetadata({
  title: "My Room: Plan a Dorm Room With Your Roommate",
  description: "A shared dorm room for you and your roommates: split the room, settle who brings what, and plan it together on a call. Included with dormscape Pro.",
  path: "/my-room",
});

export default function MyRoomPage() {
  return (
    <PageShell navOverlay>
      <JsonLd data={{ ...webPageJsonLd({ path: "/my-room", name: "Split the room, not the fridge." }), inLanguage: "en-US" }} />
      <MyRoomHome />
    </PageShell>
  );
}
