import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ContactForm from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions, feedback, a school we should add, or a bug to report? Send the Dormscape team a message.",
};

export default function ContactPage() {
  return (
    <div>
      <Nav />
      <main>
        <div className="mx-auto max-w-2xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Get in touch
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Contact <span className="hl">us</span>
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Questions, feedback, a school we should add, or something not working right —
            send it over and we&apos;ll get back to you at the email you leave.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </main>
    </div>
  );
}
