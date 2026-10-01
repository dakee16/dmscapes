import RoomWorkspacePage from "@/components/workspace/RoomWorkspacePage";
export default async function WorkspacePage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <RoomWorkspacePage id={id}/>; }
