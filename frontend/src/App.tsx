import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PersonaCall from "./pages/PersonaCall";
import TakedownRequestPage from "./pages/TakedownRequestPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/chamada/:personaId" element={<PersonaCall />} />
      <Route path="/pedido-remocao" element={<TakedownRequestPage />} />
    </Routes>
  );
}
