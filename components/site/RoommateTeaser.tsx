"use client";
import Link from "next/link";
import Modal from "@/components/site/Modal";
import { usePlannerStore } from "@/lib/store";
import { ArrowRight } from "@/components/ds/Icons";
import { CloseButton, TierBadge } from "@/components/account-ui/parts";
import d from "@/components/account-ui/Dialog.module.css";

export default function RoommateTeaser({ open, onClose }: { open: boolean; onClose: () => void }) {
  const room = usePlannerStore((s) => s.room),
    style = usePlannerStore((s) => s.style);
  if (!open) return null;
  return (
    <Modal
      role="dialog"
      aria-modal="true"
      aria-labelledby="studio-intro-title"
      className={d.layer}
      style={{ "--z": 60 } as React.CSSProperties}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`ds ${d.sheet}`} style={{ "--w": "540px" } as React.CSSProperties}>
        <div className={d.top}>
          <TierBadge tier="pro" />
          <CloseButton onClick={onClose} label="Close 3D introduction" />
        </div>
        <p className={d.eyebrow} style={{ marginTop: 18 }}>
          Available now / Dormscape Pro
        </p>
        <h2 id="studio-intro-title" className={d.title} style={{ marginTop: 8 }}>
          Your room. <span className={d.serif}>Every angle.</span>
        </h2>
        <p className={d.body}>
          Arrange your furniture in live 3D. Try floor finishes and lighting, explore an inside view, and switch to the same
          layout in 2D.
        </p>
        <p className={d.small}>
          Included with Pro. No extra generation credits to switch views. Shared links show a 2D plan to everyone; interactive
          3D is for Pro members.
        </p>
        <div className={d.row}>
          <Link
            className={`${d.btn} ${d.btnBlue}`}
            href={room && style ? "/plan/result" : "/plan?view=3d"}
            onClick={() => {
              usePlannerStore.getState().setPlannerView("3d");
              onClose();
            }}
          >
            Plan with 3D <ArrowRight />
          </Link>
        </div>
        <div className={d.foot}>
          <Link href="/plan/draw/3d" onClick={onClose} className={d.textLink}>
            Or build your own walls and floor with Pro
          </Link>
          <Link href="/blog/introducing-dormscape-3d-room-studio" onClick={onClose} className={d.textLink}>
            See how the studio works
          </Link>
        </div>
      </div>
    </Modal>
  );
}
