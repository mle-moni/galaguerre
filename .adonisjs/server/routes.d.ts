import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'auth.me': { paramsTuple?: []; params?: {} }
    'cards.index': { paramsTuple?: []; params?: {} }
    'decks.select': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decks.index': { paramsTuple?: []; params?: {} }
    'decks.store': { paramsTuple?: []; params?: {} }
    'decks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.index': { paramsTuple?: []; params?: {} }
    'games.store': { paramsTuple?: []; params?: {} }
    'games.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'cards.index': { paramsTuple?: []; params?: {} }
    'decks.index': { paramsTuple?: []; params?: {} }
    'decks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.index': { paramsTuple?: []; params?: {} }
    'games.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'cards.index': { paramsTuple?: []; params?: {} }
    'decks.index': { paramsTuple?: []; params?: {} }
    'decks.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.index': { paramsTuple?: []; params?: {} }
    'games.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'decks.select': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'decks.store': { paramsTuple?: []; params?: {} }
    'games.store': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'decks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'decks.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PATCH: {
    'decks.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'games.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}