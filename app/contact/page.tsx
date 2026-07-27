import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact · Dormscape",
  description:
    "Questions, feedback, or a school we should add? Send the Dormscape team a message.",
};

export default function ContactPage() {
  return (
    <div>
      <Nav />
      <main className="grid-paper grid-paper-fade">
        <div className="mx-auto max-w-xl px-5 py-16 sm:px-8 sm:py-24">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Get in touch
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Contact <span className="hl">us.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Questions, feedback, or a school we should add? Send a note and
            we&apos;ll get back to you at the email you leave.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  );
}
