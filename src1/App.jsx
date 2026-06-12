import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RootApp from "./pages/RootApp";

// Handles redirect from 404.html back to the correct route
function RedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get("p");
    if (redirectPath) {
      // Clean up the URL and navigate to the real path
      window.history.replaceState(null, "", window.location.pathname);
      navigate(redirectPath, { replace: true });
    }
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/flow-app">
      <RedirectHandler />
      <Routes>
        <Route path="/*" element={<RootApp />} />
      </Routes>
    </BrowserRouter>
  );
}
