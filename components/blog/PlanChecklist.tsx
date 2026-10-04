import { Children, isValidElement, type ReactNode } from "react";
import { Ol } from "./Prose";
import PlanChecklistClient, { type Spot } from "./PlanChecklistClient";

/**
 * A numbered list from a post, shown as the clickable checklist from the post
 * design: each item lights up its spot on an example plan. The post keeps
 * writing ordinary <Li><strong>Title.</strong> detail</Li> items; this splits
 * each into its title and detail and hands them to the interactive part.
 * `spots` maps the items, in order, to places on the plan. Anything that
 * doesn't fit that shape renders as the plain numbered list.
 */
export default function PlanChecklist({
  children,
  spots,
  label,
}: {
  children: ReactNode;
  spots: Spot[];
  /** defaults to "The 8-number checklist" for eight items */
  label?: string;
}) {
  const items = Children.toArray(children)
    .filter(isValidElement)
    .map((li, i) => {
      const kids = Children.toArray((li.props as { children?: ReactNode }).children);
      const [first, ...rest] = kids;
      if (!isValidElement(first) || first.type !== "strong") return null;
      if (typeof rest[0] === "string") rest[0] = rest[0].replace(/^\s+/, "");
      return {
        title: (first.props as { children?: ReactNode }).children,
        body: rest,
        spot: spots[i],
      };
    });

  if (items.length === 0 || items.length !== spots.length || items.some((it) => !it || !it.spot)) {
    return <Ol>{children}</Ol>;
  }
  return (
    <PlanChecklistClient
      label={label ?? `The ${items.length}-number checklist`}
      items={items as NonNullable<(typeof items)[number]>[]}
    />
  );
}
