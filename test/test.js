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
    testA: await testRun("A: Single file build success.", "./test/fixtures/projectA"),
    testB: await testRun("B: Single file build fail.", "./test/fixtures/projectB", true),
    testC: await testRun("C: Multi file build success.", "./test/fixtures/projectC"),
    testD: await testRun("D: Multi file build fail.", "./test/fixtures/projectD", true),
    testE: await testRun("E: File extension modification.", "./test/fixtures/projectE"),
    testF: await testRun("F: package(-lock).json synchronicity success.", "./test/fixtures/projectF"),
    testG: await testRun("G: package(-lock).json disabled synchronicity.", "./test/fixtures/projectG")
};

// search for any non zero exit code
process.exitCode = Object.values(tests).every(exitCode => exitCode < 1) ^ 1 ;

console.log("");
