import {useState} from "react";
import {AppShell} from "./AppShell";
import {DashboardPage} from "@/pages/Dashboard";
import {PosPage} from "@/features/pos/PosPage";

type PageKey = "inventory" | "pos";

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("inventory");

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {activePage === "inventory" ? <DashboardPage/> : <PosPage/>}
    </AppShell>
  );
}
