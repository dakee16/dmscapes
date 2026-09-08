import Footer from "@/components/Footer";
import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import ContactForm from "@/components/site/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Questions, feedback, a school we should add, or a bug to report? Send the Dormscape team a message.",
};

export default function ContactPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[28rem]" />
      <main id="page-content" tabIndex={-1} className="dm-page relative">
        <div className="dm-contact-layout">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Get in touch
          </p>
          <h1 className="dm-page-title mt-3 font-display text-4xl font-extrabold tracking-tight">
            Contact <span className="hl">us</span>
          </h1>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Questions, feedback, a school we should add, or something not working right.
            Send it over and we&apos;ll get back to you at the email you leave.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
