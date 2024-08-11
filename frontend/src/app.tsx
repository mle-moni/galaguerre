import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import { AppRouter } from "./router.jsx";

const queryClient = new QueryClient();
const root = createRoot(document.getElementById("app")!);

root.render(
    <QueryClientProvider client={queryClient}>
        <ToastContainer />
        <AppRouter />
    </QueryClientProvider>,
);
