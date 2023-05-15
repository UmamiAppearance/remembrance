import { fork } from "child_process";

const forkPromise = (modulePath, args, options) => {
    return new Promise((resolve, reject) => {
        fork(modulePath, args, options)
            .on("close", exitCode => {
                resolve(exitCode);
            })
            .on("error", error => reject(error));
    });
};

const resultSymbol = [ "✔", "✖" ];

const testRun = async (info, cwd, expectError=false) => {
    let result = await forkPromise("../../../index.js", [], { cwd });
    
    // flip result if error is expected
    if (expectError) result ^= 1; 
    
    process.stdout.write(`    ${resultSymbol[result]} ${info}\n`);
};

await testRun("Single file build success", "./test/fixtures/projectA");
await testRun("Single file build fail", "./test/fixtures/projectB", true);
await testRun("Multi file build success", "./test/fixtures/projectC");
await testRun("Multi file build fail", "./test/fixtures/projectD", true);
await testRun("File extension modification", "./test/fixtures/projectE");