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
    // run test
    let result = await forkPromise("../../../index.js", [], { cwd });
    
    // flip result if error is expected
    if (expectError) result ^= 1; 
    
    // log result
    console.log(`    ${resultSymbol[result]} ${info}`);

    return result;
};


// test runs
const tests = {
    testA: await testRun("Single file build success.", "./test/fixtures/projectA"),
    testB: await testRun("Single file build fail.", "./test/fixtures/projectB", true),
    testC: await testRun("Multi file build success.", "./test/fixtures/projectC"),
    testD: await testRun("Multi file build fail.", "./test/fixtures/projectD", true),
    testE: await testRun("File extension modification.", "./test/fixtures/projectE"),
    testF: await testRun("package(-lock).json synchronicity success.", "./test/fixtures/projectF"),
    testG: await testRun("package(-lock).json synchronicity fail.", "./test/fixtures/projectG", true),
    testH: await testRun("package(-lock).json disabled synchronicity.", "./test/fixtures/projectH")
};

// search for any non zero exit code
process.exitCode = Object.values(tests).every(exitCode => exitCode < 1) ^ 1 ;

console.log("");
