import { createRoot } from "react-dom/client";
import { SomeComponent } from "~/some_component.jsx";

const root = createRoot(document.getElementById("app")!);

root.render(<SomeComponent />);
