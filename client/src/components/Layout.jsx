import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", mark: "01", end: true },
  { to: "/board", label: "Pipeline", mark: "02" },
  { to: "/scripts", label: "Scripts", mark: "03" },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-ink text-paper">
      <aside className="relative w-56 shrink-0 border-r border-hairline flex flex-col">
        <div className="film-edge absolute left-0 top-0 bottom-0 w-2 opacity-40" />

        <div className="pl-7 pr-5 py-5 border-b border-hairline">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-ember opacity-40 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ember" />
            </span>
            <div>
              <div className="font-mono text-[13px] font-medium tracking-tight text-paper leading-tight">
                Creator Workspace
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-paper-faint">
                local studio
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 pl-7 pr-3 py-4 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-panel text-paper"
                    : "text-paper-dim hover:bg-panel-soft hover:text-paper"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`font-mono text-[10px] tabular ${
                      isActive ? "text-ember" : "text-paper-faint"
                    }`}
                  >
                    {item.mark}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="pl-7 pr-5 py-4 border-t border-hairline font-mono text-[10px] uppercase tracking-widest text-paper-faint">
          localhost · rec
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
