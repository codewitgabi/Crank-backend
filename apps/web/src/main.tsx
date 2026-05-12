import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

const app = googleClientId ? (
  <GoogleOAuthProvider clientId={googleClientId}>
    <RouterProvider router={router} />
  </GoogleOAuthProvider>
) : (
  <RouterProvider router={router} />
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>{app}</StrictMode>,
);
