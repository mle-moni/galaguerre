import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AppRouterProvider } from "./router.jsx";
import { queryClient } from "./services/query_client.js";

const root = createRoot(document.getElementById("app")!);

root.render(
    <QueryClientProvider client={queryClient}>
        <ToastContainer />
        <AppRouterProvider />
    </QueryClientProvider>,
);
