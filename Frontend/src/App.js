import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import ScheduleManagement from "./pages/ScheduleManagement";
import FacultyOverview from "./pages/FacultyOverview";
import GeneratedSchedule from "./pages/GeneratedSchedule";
import AdminSettings from "./pages/AdminSettings";
import Dashboard from "./pages/CreateSchedulePage";
import LoginPage from "./pages/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<LoginPage />} />
        
        {/* All routes below require a valid token */}
        <Route element={<ProtectedRoute />}>
          {/* Layout itself is now protected */}
          <Route element={<Layout />}>
            <Route path="/create-schedule" element={<Dashboard />} />
            <Route path="/schedule-management" element={<ScheduleManagement />} />
            <Route path="/faculty-overview" element={<FacultyOverview />} />
            <Route path="/generated-schedule" element={<GeneratedSchedule />} />
            <Route path="/admin-settings" element={<AdminSettings />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
