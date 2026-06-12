import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RootApp from "./pages/RootApp";

function RedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectPath = params.get("p");
    if (redirectPath) {
      window.history.replaceState(null, "", window.location.pathname);
      navigate(decodeURIComponent(redirectPath), { replace: true });
    }
  }, [navigate]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/flow-app/">
      <RedirectHandler />
      <Routes>
        <Route path="/*" element={<RootApp />} />
      </Routes>
    </BrowserRouter>
  );
}
