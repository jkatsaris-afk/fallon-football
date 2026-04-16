import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function RefGate({ children }) {
  const navigate = useNavigate();

  useEffect(() => {
    const loggedIn = localStorage.getItem("ref_logged_in");

    if (!loggedIn) {
      navigate("/ref-login");
    }
  }, []);

  return children;
}
