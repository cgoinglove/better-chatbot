"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgDb = void 0;
var node_postgres_1 = require("drizzle-orm/node-postgres");
exports.pgDb = (0, node_postgres_1.drizzle)(process.env.POSTGRES_URL);
