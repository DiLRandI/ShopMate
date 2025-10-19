import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {AppShell} from "./app/AppShell";
import {DashboardPage} from "./pages/Dashboard";

const container = document.getElementById("root");

const root = createRoot(container!);

root.render(
  <StrictMode>
    <AppShell>
      <DashboardPage/>
    </AppShell>
  </StrictMode>,
);
