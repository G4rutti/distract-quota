import "./site.css";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-clip">{children}</div>;
}
