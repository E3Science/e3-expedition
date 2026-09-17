import { Schema, type, MapSchema } from "@colyseus/schema";

/*
PLAYER SCHEMA
-------------
Purpose:
Defines the synchronized player data stored in room state.

Includes:
- identity fields
- class assignment fields
- admin status
- movement state
- inventory
- per-station cooldown tracking
*/

export class Player extends Schema {
  @type("string") actionName = "";
@type("string") actionDirection = "";
@type("number") actionUntilEpochMs = 0;
  @type("string") id: string = "";
  @type("string") name: string = "";
  @type("string") userId: string = "";
  @type("string") classId: string = "";
  @type("boolean") isAdmin: boolean = false;

  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") health: number = 100;
  @type("number") maxHealth: number = 100;
    @type("number") stamina: number = 100;
  @type("number") maxStamina: number = 100;

  @type("boolean") left: boolean = false;
  @type("boolean") right: boolean = false;
  @type("boolean") up: boolean = false;
  @type("boolean") down: boolean = false;

  @type({ map: "number" }) inventory = new MapSchema<number>();
  @type({ map: "number" }) stationCooldowns = new MapSchema<number>();
}
