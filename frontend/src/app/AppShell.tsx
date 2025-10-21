import type {PropsWithChildren} from "react";

type PageKey = "dashboard" | "pos" | "sales" | "reports" | "settings";

type NavItem = {
  key: PageKey;
  label: string;
  shortcut: string;
};

type AppShellProps = PropsWithChildren<{
  navItems: NavItem[];
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  lowStockCount: number;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  statusMessage?: string | null;
  shopName?: string | null;
}>;

export function AppShell({
  navItems,
  activePage,
  onNavigate,
  lowStockCount,
  isDarkMode,
  onToggleDarkMode,
  statusMessage,
  shopName,
  children,
}: AppShellProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 md:px-6 lg:px-10 lg:py-12">
      <header className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-shell transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {shopName?.trim() ? shopName : "ShopMate"}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Offline-first POS for growing shops</p>
          </div>
          <div className="mt-4 flex items-center gap-3 sm:mt-0">
            <span className="inline-flex items-center rounded-full bg-slate-100/80 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-blue-900/30 dark:text-blue-100" aria-live="polite">
              Low stock: {lowStockCount}
            </span>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              {isDarkMode ? "Light Theme" : "Dark Theme"}
            </button>
          </div>
        </div>
        <nav className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8" aria-label="Primary Navigation">
          {navItems.map(item => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-primary/40 ${
                  isActive
                    ? "bg-gradient-to-r from-brand-primary to-brand-accent text-white shadow-lg shadow-brand-primary/20"
                    : "border border-transparent bg-blue-50 text-brand-primary hover:bg-blue-100 dark:bg-slate-800/60 dark:text-blue-100 dark:hover:bg-slate-700"
                }`}
              >
                <span>{item.label}</span>
                <kbd className="rounded-md bg-white/70 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">{item.shortcut}</kbd>
              </button>
            );
          })}
        </nav>
        {statusMessage && (
          <p className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm font-semibold text-brand-primary dark:border-slate-700 dark:bg-slate-800/60 dark:text-blue-200" role="status">
            {statusMessage}
          </p>
        )}
      </header>

      <main className="flex-1 rounded-3xl border border-slate-200/70 bg-gradient-to-br from-blue-50/80 via-white to-emerald-50/60 p-4 shadow-sm transition-colors duration-200 dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900/90 sm:p-6" role="main">
        {children}
      </main>
    </div>
  );
}
