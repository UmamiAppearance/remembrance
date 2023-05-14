import { readFile, stat } from "fs/promises";
//import picomatch from "picomatch";
console.log(process.cwd());

let data;
try {
    data = await readFile("./remembrance.json", "utf8");
} catch(err) {
    if (err) {
        if (err.code === "ENOENT") {
            console.error("Could not find config file 'remembrance.json' in projects root folder.");
        } else {
            console.error(err);
        }
        process.exit(1);
    }
};
console.log(data);


