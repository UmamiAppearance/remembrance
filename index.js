import { existsSync, stat } from "fs";

if (!existsSync("./remembrance.json")) {
    console.error("Could not find config file 'remembrance.json' in projects root folder.");
    process.exit(1);
}

