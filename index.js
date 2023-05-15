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
    data = await readFile(joinPath(CWD, "remembrance.json"), "utf8");
} catch(err) {
    if (err) {
        if (err.code === "ENOENT") {
            throwError("Could not find config file 'remembrance.json' in projects root folder.");
        }
        throwError(err);
    }
}
const config = JSON.parse(data);

// test for the two mandatory keys "src" and "dist"
if (!config.src) {
    throwError("Key 'src' must be set in 'remembrance.json'.");
}
if (!config.dist) {
    throwError("Key 'dist' must be set in 'remembrance.json'.");
}


// set other config default parameters
if (config.debug === undefined) {
    config.debug = false;
}

if (!Array.isArray(config.extensions)) {
    config.extensions = [ "cjs", "js", "map", "mjs", "ts" ];
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

// log config settings in debug mode
if (config.debug) {
    debugInfo(`Config-Settings ${JSON.stringify(config, null, 4)}`);
}


// ignore typical test folders by default
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

if (config.debug) {
    debugInfo(`Most current source file is '${mostCurrentFile}'`);
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
            console.warn(`  ==> Dist-File '${file}' is not up to date <==`);
        }
    }
}

// exit with an error if error case not deliberately ignored
if (outdated && !config.warnOnly) {
    process.exit(1);
}
