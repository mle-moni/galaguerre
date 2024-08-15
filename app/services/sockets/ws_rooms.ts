export const WsRooms = {
    connectedSockets: "connectedSockets",
    personalSocketRoom: (userId: number) => `users:${userId}`,
};
