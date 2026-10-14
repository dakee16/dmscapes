import type { FormEvent } from "react";

// WebMCP (developer.chrome.com/docs/ai/webmcp/declarative-api, Chrome origin
// trial): a <form> with toolname + tooldescription becomes a tool an in-browser
// AI agent can call; its fields are the parameters. Browsers without WebMCP
// ignore the attributes.
declare module "react" {
  interface FormHTMLAttributes<T> {
    toolname?: string;
    tooldescription?: string;
    /** Present ("") to let the agent submit without a click. */
    toolautosubmit?: "";
  }
  interface InputHTMLAttributes<T> {
    toolparamdescription?: string;
  }
}

/** Tell a WebMCP agent what a tool form did. A no-op when a person submits. */
export function replyToAgent(e: FormEvent<HTMLFormElement>, result: string) {
  const ev = e.nativeEvent as SubmitEvent & { agentInvoked?: boolean; respondWith?: (r: Promise<string>) => void };
  if (ev.agentInvoked) ev.respondWith?.(Promise.resolve(result));
}
