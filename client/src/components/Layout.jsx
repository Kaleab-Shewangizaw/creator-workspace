import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: "◧", end: true },
  { to: "/board", label: "Pipeline", icon: "▦" },
  { to: "/scripts", label: "Scripts", icon: "✎" },
];

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#0f1115] text-gray-200">
      <aside className="w-60 shrink-0 border-r border-white/10 flex flex-col">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center font-bold text-white">
              ▶
            </div>
            <div>
              <div className="font-semibold leading-tight">Creator Workspace</div>
              <div className="text-xs text-gray-500">local studio</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-5 py-4 border-t border-white/10 text-xs text-gray-600">
          Running on localhost
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
