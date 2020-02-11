#!/usr/bin/env node

var fs = require("fs");
const chalk = require("chalk");
var path = require("path");

var filePath = ".";

var fileInfoArray = [];
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

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      var fileExt = path.extname(`${dirPath}/${file}`.toString());
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

async function performFunctions() {
  try {
    // Getting All files from directories
    files = getAllFiles(filePath, files);
    console.log("Total Files: ", files.length);

    // Compression Level of image
    const compressionLevel =
      options.compress === "moderate"
        ? 40
        : options.compress === "high"
        ? 15
        : 70
    // Compressing Images
    const Jimp = require("jimp");
    files.forEach(async imgPath => {
      // console.log(imgPath)
      const image = await Jimp.read(imgPath);
      await image.quality(compressionLevel);
      await image.writeAsync("build/" + imgPath);
    });

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
      fileInfoArray.push(await generate_callback(file));
    }
    // Show images based on order specified by command or ascending
    options.order === "desc"
      ? fileInfoArray.sort(GetSortOrderDesc("size"))
      : fileInfoArray.sort(GetSortOrderAsc("size"));
    // Displaying Images
    fileInfoArray.forEach(element => {
      console.log(element.file);
      console.log(element.info);
    });
  } catch (error) {
    console.log("Something went wrong");
    console.log(error);
  }
}
// Running the function to perform function
performFunctions();
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

//Getting the size of image
async function generate_callback(file) {
  // Getting file extention
  var fileExt = path.extname(file.toString());
  fileExt = fileExt.substring(1, fileExt.length);
  fileExt = fileExt.toUpperCase();
  return new Promise((resolve, reject) => {
    fs.stat(file, function(err, stats) {
      let fileSize = Math.ceil(stats["size"] / 1000);
      // getting color to display in cli
      let color =
        fileSize >= 500
          ? "red"
          : fileSize <= 500 && fileSize >= 200
          ? "yellow"
          : "green";
      // Setting size color
      let info =
        color === "red"
          ? chalk.red.bold(`        Size:  ${fileSize} KB`)
          : color === "yellow"
          ? chalk.yellow.bold(`        Size:  ${fileSize} KB`)
          : chalk.green.bold(`        Size:  ${fileSize} KB`);
      // Setting file name color
      file =
        color === "red"
          ? chalk.red.bold(`[${fileExt}]  ${file}`)
          : color === "yellow"
          ? chalk.yellow.bold(`[${fileExt}]  ${file}`)
          : chalk.green.bold(`[${fileExt}]  ${file}`);
      // Retrun information about file
      resolve({ size: fileSize, info: info, file: file });
    });
  });
}
