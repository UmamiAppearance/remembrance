#!/usr/bin/env node

/**
 * [remembrance]{@link https://github.com/UmamiAppearance/remembrance}
 *
 * @version 0.3.1
 * @author UmamiAppearance [mail@umamiappearance.eu]
 * @license MIT
 */


import { join as joinPath } from "path";
import { readdir, readFile, stat } from "fs/promises";
import picomatch from "picomatch";

// helpers
const CWD = process.cwd();
const isDirectory = async filePath => (await stat(filePath)).isDirectory();

// ensure array and resolve relative paths
const renderList = rawInput => {

    const ensureArray = arr => Array.isArray(arr) ? arr : [arr];
    
    return ensureArray(rawInput).map(pattern => {
        if (pattern.at(0) === ".") {
            return joinPath(CWD, pattern);
        }
        return pattern;
    });
};

const throwError = message => {
    console.error(message);
    process.exit(1);
};

const debugInfo = info => console.log(`\nDEBUG INFO\n==========\n${info}\n`);


// read config vars
let data;
try {
    data = await readFile(joinPath(CWD, ".remembrance.json"), "utf8");
} catch(err) {
    if (err) {
        if (err.code === "ENOENT") {
            throwError("Could not find config file '.remembrance.json' in projects root folder.");
        }
        throwError(err);
    }
}
const config = JSON.parse(data);

// set a variable for solo package.json tests
let jsonSolo = false;

// test for the two mandatory keys "src" and "dist" (unless "packageJSON" is set to "solo")
if (config.packageJSON !== "solo") {
    if (!config.src) {
        throwError("Key 'src' must be set in '.remembrance.json'.");
    }
    if (!config.dist) {
        throwError("Key 'dist' must be set in '.remembrance.json'.");
    }
} else {
    jsonSolo = true;
}


// set other config default parameters
if (config.debug === undefined) {
    config.debug = false;
}

if (!Array.isArray(config.extensions)) {
    config.extensions = [ "cjs", "js", "map", "mjs", "ts" ];
}

if (config.packageJSON === undefined) {
    config.packageJSON = true;
}

if (config.warnOnly === undefined) {
    if (process.env.NODE_ENV && process.env.NODE_ENV === "development") {
        config.warnOnly = true;
    } else {
        config.warnOnly = false;
    }
}

if (config.silent === undefined) {
    config.silent = false;
}

// set default tolerance in ms
if (config.tolerance === undefined) {
    config.tolerance = 5000;
}

// log config settings in debug mode
if (config.debug) {
    debugInfo(`Config-Settings ${JSON.stringify(config, null, 4)}`);
}

// test package.json anf package-lock.json if not disabled
let preError = false;
if (config.packageJSON) {
    if (config.debug) {
        debugInfo("Testing if 'package-lock.json' is up to date...");
    }

    const testPKGJson = async file => {
        let mtime;
        try {
            mtime = (await stat(joinPath(CWD, file))).mtime;
        } catch(err) {
            if (err.code !== "ENOENT") {
                throwError(err);
            } else if (config.debug) {
                console.log(`... '${file}' was not found --> skipped`);
            }
        }
        return mtime;
    };

    let packageJSONmTime = await testPKGJson("package.json");
    
    if (packageJSONmTime) {
        
        packageJSONmTime = new Date(packageJSONmTime.setMilliseconds(packageJSONmTime.getMilliseconds() - config.tolerance));
        const packageLockJSONmTime = await testPKGJson("package-lock.json");
        
        if (packageLockJSONmTime) {
            if (packageLockJSONmTime < packageJSONmTime) {
                if (!config.silent) {
                    console.warn("  ==> 'package-lock.json' is not up to date");
                }
                if (!config.warnOnly) {
                    process.exit(1);
                } else {
                    preError = true;
                }
            }

            else if (config.debug) {
                console.log("... PASSED!\n");
            }
        }
    }
}   

// end here if jsonSolo
if (jsonSolo) {
    process.exit(0);
}


// ignore typical test folders by default (cf. https://github.com/avajs/ava/blob/main/docs/05-command-line.md)
const excludeList = !config.includeTests
    ? [
        "**/__tests__/**/__helper__/**/*",
        "**/__tests__/**/__helpers__/**/*",
        "**/__tests__/**/__fixture__/**/*",
        "**/__tests__/**/__fixtures__/**/*",
        "**/test/**/helper/**/*",
        "**/test/**/helpers/**/*",
        "**/test/**/fixture/**/*",
        "**/test/**/fixtures/**/*",
        "**/tests/**/helper/**/*",
        "**/tests/**/helpers/**/*",
        "**/tests/**/fixture/**/*",
        "**/tests/**/fixtures/**/*"
    ]
    : [];


// set verbose debugging if requested
let verboseDebugging = false;
if (config.debug) {
    if (config.debug === "verbose") {
        verboseDebugging = true;
    }

    if (excludeList.length) {
        debugInfo(`Test folder exclude pattern:\n${JSON.stringify(config, null, 4)}`);
    } else {
        debugInfo("No test folders are explicitly excluded.");
    }
}


// add user defined folders/files to exclude list
if (config.exclude) {
    excludeList.push(...renderList(config.exclude));
    
    if (config.debug) {
        debugInfo("Found user defined exclude files");
    }
} else if (config.debug) {
    debugInfo("No exclude files/directories defined by the user.");
}


// build a picomatch function to ignore the exclude list (always return false if list is empty)
const exclude = excludeList.length
    ? picomatch(excludeList)
    : () => false;
 

// always ignore node_modules and git(hub) files 
const reMatch = (arr) => new RegExp(arr.join("|"));
const noWayDirs = reMatch([
    "^\\.git(:?hub)?$",
    "^node_modules$"
]);


// build a function to match the defined extensions
const ensureExtension = reMatch(
    config.extensions
        .map(ext => `\\.${ext}$`)
);

// source and dist file picomatch functions
const matchSrc = picomatch(renderList(config.src));
const matchDist = picomatch(renderList(config.dist));


// file collecting function
const collectFiles = async () => {
    if (config.debug) {
        debugInfo("Start collecting files!");
    }
    
    const srcFiles = [];
    const distFiles = [];
    
    // recursive collect function
    const collect = async dirPath => {
        
        const files = await readdir(dirPath);

        if (verboseDebugging) {
            debugInfo(`Entering directory: '${dirPath}'`);
            console.log(`File List: ${JSON.stringify(files, null, 4)}\n`);
        }

    
        for (const file of files) {
            
            // if file is a directory call collect function recursively
            if (await isDirectory(joinPath(dirPath, file))) {
                if (!noWayDirs.test(file)) {
                    await collect(joinPath(dirPath, file));
                }
            }
            
            // otherwise test the file if the file extension is valid
            else if (ensureExtension.test(file)) {
                const fullPath = joinPath(dirPath, file);
                
                if (!exclude(fullPath)) {
                    if (verboseDebugging) {
                        console.log(`(File '${file}' gets tested against the match list)`);
                    }
                
                    if (matchSrc(fullPath)) {
                        srcFiles.push(fullPath);
                        if (config.debug) {
                            console.log(`  * Found match for source file list: '${fullPath}'`);
                        }
                    } 
                    
                    else if (matchDist(fullPath)) {
                        distFiles.push(fullPath);
                        if (config.debug) {
                            console.log(`  * Found match for dist file list: '${fullPath}'`);
                        }
                    }

                    else if (verboseDebugging) {
                        console.log("    - no match --> skipped");
                    }
                }

                else if (verboseDebugging) {
                    console.log(`  * File '${file}' found on exclusion list --> skipped`);
                }
            } else if (verboseDebugging) {
                console.log(`(File '${file}' is not part of the extension list) --> skipped`);
            }

        }
    };

    // start collection function at the current working directory (the project's root folder)
    await collect(CWD);

    if (!srcFiles.length) {
        throwError("Could not find any source files");
    } else if (!distFiles.length) {
        throwError("Could not find any dist files");
    }

    return { srcFiles, distFiles };
};


// collect source and dist files in different vars
const { srcFiles, distFiles } = await collectFiles();

// list all 
if (config.debug) {
    debugInfo("Source Files Collection:");
    console.table(srcFiles);

    debugInfo("Dist Files Collection:");
    console.table(distFiles);
}

// initialize a last modified value for the source files
// start at unix-time zero (to allow immediate overwriting)
let sTime = new Date(0);
let mostCurrentFile;



// search for the most current source file
if (verboseDebugging) {
    debugInfo("Analyzing Source Files:");
}

for (const file of srcFiles) {
    const { mtime } = await stat(file);

    if (verboseDebugging) {
        console.log(`  * Source-File: '${file}\n  * Modified: ${mtime}'`);
    }

    // overwrite source greatest modified time if the value is bigger
    if (mtime > sTime) {
        sTime = mtime;
        mostCurrentFile = file;
    }
}

// remove some milliseconds to add tolerance (according to config.tolerance)
sTime = new Date(sTime.setMilliseconds(sTime.getMilliseconds() - config.tolerance));

if (config.debug) {
    debugInfo(`Most current source file is '${mostCurrentFile}' (${sTime})`);
}


// search for outdated dist files
if (verboseDebugging) {
    debugInfo("Analyzing Dist Files:");
}

let outdated = false;
for (const file of distFiles) {
    const { mtime } = await stat(file);

    if (verboseDebugging) {
        console.log(`  * Dist-File: '${file}\n  * Modified: ${mtime}'`);
    }

    // any source file, which is modified after the most current source file
    // produces an error case
    if (mtime < sTime) {
        outdated = true;
        if (!config.silent) {
            console.warn(`  ==> '${file}' is not up to date`);
        }
    }
}

// exit with an error if error case not deliberately ignored
if (outdated) {
    if (config.debug) {
        debugInfo("Finished tests, but found errors.");
    }

    if (!config.warnOnly) {
        process.exitCode = 1;
    } else if (config.debug) {
        debugInfo("Due to current settings errors are ignored.");
    }
}

else if (config.debug) {
    if (!preError) {
        debugInfo("Finished tests without errors.");
    } else {
        debugInfo("Main tests passed.");
    }
}
