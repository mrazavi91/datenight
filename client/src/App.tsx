import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AuthPage from "@/pages/AuthPage";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import CheckoutComplete from "@/pages/CheckoutComplete";
import OneTimeCheckoutComplete from "@/pages/OneTimeCheckoutComplete";
import OneTimeInviteResponse from "@/pages/OneTimeInviteResponse";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Support from "@/pages/Support";
import VerifyEmail from "@/pages/VerifyEmail";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import { useCouple } from "@/hooks/useCouple";

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-4xl animate-wiggle">💕</div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireCouple({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useCouple();
  if (isLoading) return <FullScreenLoader />;
  if (!data?.couple?.paired) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Signed-out visitors land on the marketing Home page; signed-in users get the app itself.
function RootRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader />;
  if (!user) return <Home />;
  return (
    <RequireCouple>
      <Dashboard />
    </RequireCouple>
  );
}

export default function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/about" element={<About />} />
      <Route path="/support" element={<Support />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/settings"
        element={
          <RequireAuth>
            <Settings />
          </RequireAuth>
        }
      />
      <Route path="/first-date/:token" element={<OneTimeInviteResponse />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <AuthPage mode="signup" />} />
      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <Onboarding />
          </RequireAuth>
        }
      />
      <Route
        path="/checkout/complete"
        element={
          <RequireAuth>
            <CheckoutComplete />
          </RequireAuth>
        }
      />
      <Route
        path="/one-time/checkout/complete"
        element={
          <RequireAuth>
            <OneTimeCheckoutComplete />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
