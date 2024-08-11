import { createRoot } from "react-dom/client";
import { AppRouter } from "./router.jsx";

const root = createRoot(document.getElementById("app")!);

root.render(<AppRouter />);
