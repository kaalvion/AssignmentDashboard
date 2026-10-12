import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import TeacherAssignments from './pages/TeacherAssignments';
import TeacherPostAssignment from './pages/TeacherPostAssignment';
import TeacherSubmissions from './pages/TeacherSubmissions';
import Admin from './pages/Admin';
import MyTasks from './pages/MyTasks';
import AcademicCalendar from './pages/Calendar';
import SmartStudyPlanner from './pages/Planner';
import Analytics from './pages/Analytics';
import Leaderboard from './pages/Leaderboard';
import Achievements from './pages/Achievements';
import Groups from './pages/Groups';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

/**
 * RoleRoute:
 * Protects routes based on authentication state and user role.
 * If user does not have permission, gracefully redirects to /dashboard.
 */
const RoleRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        Loading Nexus Dashboard...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role || 'STUDENT';
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const LegacyAssignmentRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
    return <Navigate to="/teacher/assignments/new" replace />;
  }
  return <Navigate to="/assignments" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login/*" element={<Login />} />
            <Route path="/register/*" element={<Register />} />

            {/* Authenticated Routes - Common */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <RoleRoute>
                  <Dashboard />
                </RoleRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <RoleRoute>
                  <Profile />
                </RoleRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <RoleRoute>
                  <Settings />
                </RoleRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/assignments"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <Assignments />
                </RoleRoute>
              }
            />
            <Route
              path="/assignments/:id"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <AssignmentDetail />
                </RoleRoute>
              }
            />
            <Route
              path="/assignments/new"
              element={
                <RoleRoute>
                  <LegacyAssignmentRedirect />
                </RoleRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <AcademicCalendar />
                </RoleRoute>
              }
            />
            <Route
              path="/planner"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <SmartStudyPlanner />
                </RoleRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <Analytics />
                </RoleRoute>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <Leaderboard />
                </RoleRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <Achievements />
                </RoleRoute>
              }
            />
            <Route
              path="/groups"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <Groups />
                </RoleRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <RoleRoute allowedRoles={['STUDENT']}>
                  <MyTasks />
                </RoleRoute>
              }
            />

            {/* Teacher & Admin Routes */}
            <Route
              path="/teacher/assignments"
              element={
                <RoleRoute allowedRoles={['TEACHER', 'ADMIN']}>
                  <TeacherAssignments />
                </RoleRoute>
              }
            />
            <Route
              path="/teacher/assignments/new"
              element={
                <RoleRoute allowedRoles={['TEACHER', 'ADMIN']}>
                  <TeacherPostAssignment />
                </RoleRoute>
              }
            />
            <Route
              path="/teacher/assignments/:id/edit"
              element={
                <RoleRoute allowedRoles={['TEACHER', 'ADMIN']}>
                  <TeacherPostAssignment />
                </RoleRoute>
              }
            />
            <Route
              path="/teacher/assignments/:id/submissions"
              element={
                <RoleRoute allowedRoles={['TEACHER', 'ADMIN']}>
                  <TeacherSubmissions />
                </RoleRoute>
              }
            />

            {/* Admin Exclusive Route */}
            <Route
              path="/admin"
              element={
                <RoleRoute allowedRoles={['ADMIN']}>
                  <Admin />
                </RoleRoute>
              }
            />

            {/* Catch All */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
