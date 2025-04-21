"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sqliteDb = void 0;
var libsql_1 = require("drizzle-orm/libsql");
var client_1 = require("@libsql/client");
exports.sqliteDb = (0, libsql_1.drizzle)({
    client: (0, client_1.createClient)({ url: process.env.FILEBASE_URL }),
});
