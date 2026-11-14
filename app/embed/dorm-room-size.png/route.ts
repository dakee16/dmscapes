import { dormSizeChart } from "@/lib/embed";
import { chartImage } from "../chart";

// The /dorm-room-size chart as a PNG, built once per deploy.
export const dynamic = "force-static";

export function GET() {
  return chartImage(dormSizeChart());
}
