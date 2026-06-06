import "@adonisjs/core/types/http";

type ParamValue = string | number | bigint | boolean;

export type ScannedRoutes = {
    ALL: {
        "auth.login": { paramsTuple?: []; params?: {} };
        "auth.logout": { paramsTuple?: []; params?: {} };
        "auth.me": { paramsTuple?: []; params?: {} };
        "games.index": { paramsTuple?: []; params?: {} };
        "games.store": { paramsTuple?: []; params?: {} };
        "games.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
        "games.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    GET: {
        "auth.me": { paramsTuple?: []; params?: {} };
        "games.index": { paramsTuple?: []; params?: {} };
        "games.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    HEAD: {
        "auth.me": { paramsTuple?: []; params?: {} };
        "games.index": { paramsTuple?: []; params?: {} };
        "games.show": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    POST: {
        "auth.login": { paramsTuple?: []; params?: {} };
        "auth.logout": { paramsTuple?: []; params?: {} };
        "games.store": { paramsTuple?: []; params?: {} };
    };
    PUT: {
        "games.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    DELETE: {
        "games.destroy": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
    PATCH: {
        "games.update": { paramsTuple: [ParamValue]; params: { id: ParamValue } };
    };
};
declare module "@adonisjs/core/types/http" {
    export interface RoutesList extends ScannedRoutes {}
}
