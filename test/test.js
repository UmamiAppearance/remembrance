import { fork } from "child_process";

//process.chdir("./projectA");

const forkPromise = (modulePath, args, options) => {
    return new Promise((resolve, reject) => {
        fork(modulePath, args, options)
            .on("close", exitCode => {
                resolve(exitCode);
            })
            .on("error", error => reject(error));
    });
};


const projectA = await forkPromise("../../../index.js", [], { cwd: "./test/fixtures/projectA" });
const projectB = await forkPromise("../../../index.js", [], { cwd: "./test/fixtures/projectB" });

console.log(projectA);
console.log(projectB);
