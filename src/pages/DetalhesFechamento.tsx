import { Navigate } from "react-router-dom";

// Page deprecated — fechamento details are now edited via the sheet in /pcp/fechamentos.
export default function DetalhesFechamento() {
  return <Navigate to="/pcp/fechamentos" replace />;
}
