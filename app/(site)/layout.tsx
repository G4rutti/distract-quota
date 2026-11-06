import "@fontsource-variable/sofia-sans-extra-condensed";
import "@fontsource-variable/onest";
import "@fontsource-variable/martian-mono";
import "lenis/dist/lenis.css";
import "./site.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="pt-site">{children}</div>;
}
