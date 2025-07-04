import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id!: string;
  @type("string") name!: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") connected: boolean = false;
  @type("number") lastActive: number = Date.now();
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("number") serverTime: number = Date.now();
  @type("string") gameStatus: string = "waiting";
}