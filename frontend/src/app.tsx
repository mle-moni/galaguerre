import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import { AppRouter } from "./router.jsx";

import "react-toastify/dist/ReactToastify.css";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});
const root = createRoot(document.getElementById("app")!);

root.render(
    <QueryClientProvider client={queryClient}>
        <ToastContainer />
        <AppRouter />
    </QueryClientProvider>,
);
