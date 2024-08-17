import "@mantine/core/styles.css";
import "react-toastify/dist/ReactToastify.css";
import "./style/app.css";

import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import { ToastContainer } from "react-toastify";
import { AppRouterProvider } from "./router.jsx";
import { queryClient } from "./services/query_client.js";
import { mantineTheme } from "./style/mantine_theme.js";

const root = createRoot(document.getElementById("app")!);

root.render(
    <MantineProvider theme={mantineTheme}>
        <QueryClientProvider client={queryClient}>
            <ToastContainer />
            <AppRouterProvider />
        </QueryClientProvider>
    </MantineProvider>,
);
