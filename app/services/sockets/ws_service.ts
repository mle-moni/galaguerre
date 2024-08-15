import server from "@adonisjs/core/services/server";
import { Server } from "socket.io";

class Ws {
    io: Server | undefined;

    boot(): Server {
        /**
         * Ignore multiple calls to the boot method
         */
        if (this.io) {
            return this.io;
        }

        const ioServer = new Server(server.getNodeServer(), {
            cors: {
                origin: "*",
            },
        });

        this.io = ioServer;

        return ioServer;
    }
}

export const WS = new Ws();
