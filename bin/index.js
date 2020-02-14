#!/usr/bin/env node

const fs = require("fs");
const chalk = require("chalk");
const path = require("path");

const ora = require('ora')

var filePath = ".";

var fileInfoArray = [];
var compressedFiles = [];
var files = [];

// Get all arguments in cli
const yargs = require("yargs");
const options = yargs
  .usage("Usage: -a")
  .option("a", {
    alias: "all",
    describe: "Show all files",
    demandOption: false
  })
  .usage("Usage: -l < limit >")
  .option("l", {
    alias: "limit",
    describe: "Limit Files to show",
    type: "number",
    demandOption: false
  })
  .usage("Usage: -o < asc | desc>")
  .option("o", {
    alias: "order",
    describe: "Set order of result asc | desc",
    type: "string",
    demandOption: false
  })
  .usage("Usage: -c <  high | moderate | low >")
  .option("c", {
    alias: "compress",
    describe: "Set compression level of image high | moderate | low",
    type: "string",
    demandOption: false
  })
  .usage("Usage: -w")
  .option("w", {
    alias: "analyze",
    describe: "Analyze the images in the directory",
    demandOption: false
  }).argv;

options.compress = options.compress ? options.compress : "moderate";
// Setting default order of the array to display
options.order = options.order ? options.order : "asc";
// If limit is not a number
options.limit = options.limit ? parseInt(options.limit) : false;

// Getting all files recursively from all directories
const getAllFiles = function(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];
  // Loop  through files in directory
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      var fileExt = path.extname(`${dirPath}/${file}`.toString());
      // Adding only image files
      if (
        fileExt === ".png" ||
        fileExt === ".jpeg" ||
        fileExt === ".jpg" ||
        fileExt === ".gif"
      ) {
        arrayOfFiles.push(dirPath + "/" + file);
      }
    }
  });

  return arrayOfFiles;
};

// const process = require("process")
// const rdl = require("readline")
// class LoadingBar {
//     constructor(size) {
//         this.size = size
//         this.cursor = 0
//         this.timer = null
//     }
// start() {
//         process.stdout.write("\x1B[?25l")
//         for (let i = 0; i < this.size; i++) {
//             process.stdout.write("\u2591")
//         }
//         rdl.cursorTo(process.stdout, this.cursor, 0);
//         this.timer = setInterval(() => {
//             process.stdout.write("\u2588")
//             this.cursor++;
//             if (this.cursor >= this.size) {
//                 clearTimeout(this.timer)
//             }
//         }, 100)
//     }
// }

// Performing functions
async function performFunctions() {
  const spinner = ora().start()
  try {
    // Getting All files from directories
    files = getAllFiles(filePath, files);
    console.log("Total Files: ", files.length);
    if (files.length === 0) {
      console.log("No Image File found!");
      spinner.stop()
      return;
    }
    // Setting Limit of images to show
    let showFiles = 25;
    options.all
      ? (showFiles = files.length)
      : options.limit
      ? (showFiles = options.limit)
      : showFiles;
    showFiles = showFiles > files.length ? files.length : showFiles;
    // Loop through files
    for (var i = 0; i < showFiles; i++) {
      let file = files[i];
      fileInfoArray.push(await getFileSize(file));
    }

    // Show images based on order specified by command or ascending
    options.order === "desc"
      ? fileInfoArray.sort(GetSortOrderDesc("size"))
      : fileInfoArray.sort(GetSortOrderAsc("size"));

    // Displaying Images
    console.log("--------------------------");
        fileInfoArray.forEach(elm => {
          color =
            elm.size >= 500
              ? "red"
              : elm.size <= 500 && elm.size >= 200
              ? "yellow"
              : "green";
          analyzeImages(color, elm.size, elm.file);
          console.log("--------------------------");
        });

    if (!options.analyze) {
      // Compression Level of image
      const compressionLevel =
        options.compress === "moderate"
          ? 40
          : options.compress === "high"
          ? 10
          : 70;
      // Compressing Images
      const Jimp = require("jimp");
      for (var i = 0; i < showFiles; i++) {
        let imgPath = files[i];
        const image = await Jimp.read(imgPath);
        await image.quality(compressionLevel);
        await image.writeAsync("build/" + imgPath);
      }

      files = getAllFiles("./build", []);

      // Loop through files
      for (var i = 0; i < showFiles; i++) {
        let file = files[i];
        compressedFiles.push(await getFileSize(file));
      }
      spinner.succeed('Optimization Completed')
      console.log("--------------------------");
      fileInfoArray.forEach(elm => {
        compressedFiles.forEach(cmprsElm => {
          if (elm.file === "." + cmprsElm.file.substring(7, cmprsElm.length)) {
            color =
              cmprsElm.size >= 500
                ? "red"
                : cmprsElm.size <= 500 && cmprsElm.size >= 200
                ? "yellow"
                : "green";
            showStats(color, cmprsElm.size, elm.size, cmprsElm.file);
          }
        });
        console.log("--------------------------");
      })
    }
    spinner.stop()  
  } catch (error) {
    spinner.fail('Something went wrong')
    console.log("Something went wrong");
    console.log(error);
  }
}
// Running the function to perform function

performFunctions();

// Show stats
function showStats(color, cmprsSize, unCmprsSize, file) {
  let fileExt = getExtention(file);
  let percentage = Math.ceil((cmprsSize / unCmprsSize) * 100);

  if (color === "red") {
    console.log(chalk.red.bold(`×  [OPTIMIZED]  ${file.toUpperCase()}`));
    console.log(
      chalk.red.bold(
        ` ${fileExt}:  ${unCmprsSize} KB -> ${fileExt}:  ${cmprsSize} KB   ${100 -
          percentage} %`
      )
    );
  } else if (color === "yellow") {
    console.log(chalk.yellow.bold(`‼ [OPTIMIZED]  ${file.toUpperCase()}`));
    console.log(
      chalk.yellow.bold(
        ` ${fileExt}:  ${unCmprsSize} KB -> ${fileExt}:  ${cmprsSize} KB   ${100 -
          percentage} %`
      )
    );
  } else {
    console.log(chalk.green.bold(`√ [OPTIMIZED]  ${file.toUpperCase()}`));
    console.log(
      chalk.green.bold(
        ` ${fileExt}:  ${unCmprsSize} KB -> ${fileExt}:  ${cmprsSize} KB   ${100 -
          percentage} %`
      )
    );
  }
}

function analyzeImages(color, size, file) {
  let fileExt = getExtention(file);
  if (color === "red") {
    console.log(chalk.red.bold(`× [IMAGE] ${file.toUpperCase()}`));
    console.log(chalk.red.bold(`  ${fileExt}:  ${size} KB`));
  } else if (color === "yellow") {
    console.log(chalk.yellow.bold(`‼ [IMAGE] ${file.toUpperCase()}`));
    console.log(chalk.yellow.bold(`  ${fileExt}:  ${size} KB`));
  } else {
    console.log(chalk.green.bold(`√ [IMAGE] ${file.toUpperCase()}`));
    console.log(chalk.green.bold(` ${fileExt}:  ${size} KB`));
  }
}
// Function to get array in ascending order
const GetSortOrderAsc = prop => {
  return (a, b) => {
    // Actually ordering the array
    if (a[prop] > b[prop]) {
      return 1;
    } else if (a[prop] < b[prop]) {
      return -1;
    }
    return 0;
  };
};

// Function to get array in descending order
const GetSortOrderDesc = prop => {
  return (a, b) => {
    // Actually ordering the array
    if (b[prop] > a[prop]) {
      return 1;
    } else if (b[prop] < a[prop]) {
      return -1;
    }
    return 0;
  };
};

// Getting Extention of file
function getExtention(file) {
  var fileExt = path.extname(file.toString());
  fileExt = fileExt.substring(1, fileExt.length);
  fileExt = fileExt.toUpperCase();
  return fileExt;
}

//Getting the size of image
async function getFileSize(file) {
  return new Promise((resolve, reject) => {
    fs.stat(file, function(err, stats) {
      let fileSize = Math.ceil(stats["size"] / 1000);
      resolve({ size: fileSize, file: file });
    });
  });
}
