import { NavLink, Outlet } from "react-router";
import { ThemeToggle } from "../theme/ThemeToggle";
import "./AppShell.css";

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Overview" },
  ...(import.meta.env.DEV ? [{ to: "/styleguide", label: "Styleguide" }] : []),
];

export function AppShell() {
  return (
    <div className="shell">
      <header className="shell__header">
        <span className="shell__title">Kardashev Telemetry</span>
        <nav className="shell__nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end className="shell__link">
              {item.label}
            </NavLink>
          ))}
        </nav>
        <ThemeToggle />
      </header>
      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
}
