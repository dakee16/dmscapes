import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

/**
 * Every redesigned content page: the .ds root (paper, Archivo, focus rings),
 * the site nav, <main id="page-content"> for the skip link, and the footer.
 * `navOverlay` lets a colored hero run up under a transparent nav.
 */
export default function PageShell({
  children,
  navOverlay = false,
  navTone = "light",
  className = "",
}: {
  children: React.ReactNode;
  navOverlay?: boolean;
  navTone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={`ds ${className}`}>
      <Nav overlay={navOverlay} tone={navTone} />
      <main id="page-content" tabIndex={-1}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
