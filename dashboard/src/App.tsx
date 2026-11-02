import { Route, Routes } from "react-router";
import { AppShell } from "./layout/AppShell";
import { HealthPage } from "./routes/HealthPage";
import { StyleguidePage } from "./routes/StyleguidePage";
import { ThemeProvider } from "./theme/ThemeProvider";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HealthPage />} />
          {import.meta.env.DEV && <Route path="styleguide" element={<StyleguidePage />} />}
        </Route>
      </Routes>
    </ThemeProvider>
  );
}
