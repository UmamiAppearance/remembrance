import { join as joinPath } from "path";
import { readdir, readFile, stat } from "fs/promises";
import picomatch from "picomatch";

const CWD = process.cwd();
const ensureArray = arr => Array.isArray(arr) ? arr : [arr];
const isDirectory = async filePath => (await stat(filePath)).isDirectory();

const throwError = message => {
    console.error(message);
    process.exit(1);
};


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


// set default parameters
if (!Array.isArray(config.extensions)) {
    config.extensions = [ "js", "cjs", "mjs", "ts" ];
}

console.log(config);

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
    ] : [];


// add user defined folders to exclude list
if (config.excludeDirs) {
    excludeList.join(ensureArray(config.excludeDirs));
}

console.log(excludeList);

// build a function to ignore the exclude list
const excludeDirs = excludeList.length
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

// source and dist file matching functions
const matchSrc = picomatch(ensureArray(config.src));
const matchDist = picomatch(ensureArray(config.dist));

// file collecting function
const collectFiles = async () => {
    
    const srcFiles = [];
    const distFiles = [];
    
    const collect = async dirPath => {
        const files = await readdir(dirPath);
    
        for (const file of files) {
            
            if (await isDirectory(joinPath(dirPath, file))) {
                if (!noWayDirs.test(file)) {
                    await collect(joinPath(dirPath, file));
                }
            }
            
            else if (ensureExtension.test(file)) {
                const fullPath = joinPath(dirPath, file);
                
                if (!excludeDirs(fullPath)) {
                    console.log(fullPath);
                
                    if (matchSrc(fullPath)) {
                        srcFiles.push(fullPath);
                    } 
                    
                    else if (matchDist(fullPath)) {
                        distFiles.push(fullPath);
                    } 
                }
            }
        }
    };

    await collect(CWD);

    if (!srcFiles.length) {
        throwError("Could not find any source files");
    } else if (!distFiles.length) {
        throwError("Could not find any dist files");
    }

    return { srcFiles, distFiles };
};


const { srcFiles, distFiles } = await collectFiles();

let sTime = new Date(0);

// search for the most current source file
for (const file of srcFiles) {
    const { mtime } = await stat(file);
    if (mtime > sTime) {
        sTime = mtime;
    }
}

// search for outdated dist files
let outdated = false;
for (const file of distFiles) {
    const { mtime } = await stat(file);
    if (mtime < sTime) {
        outdated = true;
        console.warn(`Dist-File '${file}' is not up to date.`);
    }
}

if (outdated && !config.warnOnly) {
    process.exit(1);
}
