import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id!: string;
  @type("string") name!: string;
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("boolean") connected: boolean = false;
  @type("number") lastActive: number = Date.now();
  @type("number") xp: number = 0;
}

export class Crop extends Schema {
  @type("string") id!: string;
  @type("string") playerId!: string;
  @type("string") seedType!: string;
  @type("number") x!: number;
  @type("number") y!: number;
  @type("string") plantedAt!: string;
  @type("number") growthTime!: number;
  @type("number") investmentAmount!: number;
  @type("boolean") harvested: boolean = false;
}

export class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: Crop }) crops = new MapSchema<Crop>();
  @type("number") serverTime: number = Date.now();
  @type("string") gameStatus: string = "waiting";
}