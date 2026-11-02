import { Route, Routes } from "react-router";
import { AppShell } from "./layout/AppShell";
import { HealthPage } from "./routes/HealthPage";
import { SessionDetailPage } from "./routes/SessionDetailPage";
import { SessionsPage } from "./routes/SessionsPage";
import { StyleguidePage } from "./routes/StyleguidePage";
import { ThemeProvider } from "./theme/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<SessionsPage />} />
          <Route path="health" element={<HealthPage />} />
          <Route path="sessions/:sessionId" element={<SessionDetailPage />} />
          {import.meta.env.DEV && <Route path="styleguide" element={<StyleguidePage />} />}
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
