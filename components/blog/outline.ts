import { Children, isValidElement, type ComponentType, type ReactNode } from "react";
import { H2, slugify } from "./Prose";
import PlanChecklist from "./PlanChecklist";

export interface PostOutline {
  /** every linkable H2, in order: the post's contents list */
  headings: { id: string; text: string }[];
  /** the H2 that introduces the post's plan checklist, if it has one */
  checklistId?: string;
}

function text(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(text).join("");
  if (isValidElement(node)) return text((node.props as { children?: ReactNode }).children);
  return "";
}

/**
 * Reads a post body's outline on the server, so the contents list ships in
 * the HTML. Post bodies are plain functions of the Prose primitives, so the
 * element tree can be walked without rendering it.
 */
export function outlineOf(Body: ComponentType): PostOutline {
  const out: PostOutline = { headings: [] };
  let tree: ReactNode;
  try {
    tree = (Body as () => ReactNode)();
  } catch {
    return out;
  }
  let lastId: string | undefined;
  const walk = (node: ReactNode) => {
    Children.forEach(node, (child) => {
      if (!isValidElement(child)) return;
      const props = child.props as { children?: ReactNode; id?: string };
      if (child.type === H2) {
        const label = text(props.children).trim();
        const id = props.id ?? (typeof props.children === "string" ? slugify(props.children) : undefined);
        if (id && label) {
          out.headings.push({ id, text: label });
          lastId = id;
        }
        return;
      }
      if (child.type === PlanChecklist) {
        out.checklistId ??= lastId;
        return;
      }
      walk(props.children);
    });
  };
  walk(tree);
  return out;
}
