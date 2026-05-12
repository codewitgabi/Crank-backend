import { createBrowserRouter } from "react-router-dom";
import { LandingPage } from "./components/landing/landing-page";
import { GithubOAuthCallbackPage } from "./pages/github-oauth-callback-page";
import { LoginPage } from "./pages/login-page";
import { RootLayout } from "./pages/root-layout";
import { SignupPage } from "./pages/signup-page";
import { VerifyEmailPage } from "./pages/verify-email-page";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "verify-email", element: <VerifyEmailPage /> },
      {
        path: "auth/github/callback",
        element: <GithubOAuthCallbackPage />,
      },
    ],
  },
]);
