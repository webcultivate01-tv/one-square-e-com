import { MongoMemoryServer } from "mongodb-memory-server";

const mongod = await MongoMemoryServer.create({
  instance: { port: 27017, dbName: "goboxly" },
});
console.log("MONGO_READY " + mongod.getUri());

process.on("SIGINT", async () => { await mongod.stop(); process.exit(0); });
process.on("SIGTERM", async () => { await mongod.stop(); process.exit(0); });
await new Promise(() => {});
