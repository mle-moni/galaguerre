import { Table } from "@mantine/core";
import type { ReactNode } from "react";

interface ResponsiveTableProps {
    children: ReactNode;
    minWidth?: number;
}

export const ResponsiveTable = ({ children, minWidth = 500 }: ResponsiveTableProps) => {
    return (
        <Table.ScrollContainer minWidth={minWidth} type="native">
            {children}
        </Table.ScrollContainer>
    );
};
