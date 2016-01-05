#!/usr/bin/env node

var program = require('commander');
var watch = require('watch')
var Imagemin = require('imagemin');
var imageminPngquant = require('imagemin-pngquant');
var schedule = require("node-schedule");
var fs = require('fs');

var filesAdded = [];
var filesEdited = [];
var filesToBeCompress = [];

//10秒检测文件变化
var options = {
  interval: 1000 * 10
};

//3秒定时任务
var rule = new schedule.RecurrenceRule();　
var times = [];　　
for (var i = 1; i < 180; i++) {　　　　
  times.push(i);　　
}　　
rule.second = times;　　

//处理文件大小
var fileSizeHandler = function(size) {
  if (size < 1024) {
    return size + '字节';
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(0) + 'Kb';
  } else {
    return (size / (1024 * 1024)).toFixed(1) + 'Mb';
  }
};　

var contactFileArr = function() {
  var addLen = filesAdded.length;
  var editLen = filesEdited.length;
  for (var j = 0; j < editLen; j++) {
    if (filesEdited[j] && filesEdited[j]['name'] && filesEdited[j]['name'].indexOf('git/HEAD') > -1) {
      filesEdited = [];
      filesAdded = [];
    }
  }
  filesToBeCompress = filesToBeCompress.concat(filesAdded).concat(filesEdited);
  filesEdited = [];
  filesAdded = [];
};

var compressFileArr = function() {
  contactFileArr();
  while (filesToBeCompress.length > 0) {
    var file = filesToBeCompress.shift();
    pngCompressHandler(file);
  }
};

//压缩文件
var pngCompressHandler = function(file) {
  var filePath = file.name;
  var destPath = filePath.slice(0, filePath.lastIndexOf('/'));
  var oldSize = fileSizeHandler(file.size);
  var newSize;
  new Imagemin()
    .src(filePath)
    .dest(destPath)
    .use(imageminPngquant({
      quality: '65-80',
      speed: 4
    }))
    .run(function() {
      fs.stat(filePath, function(err, stats) {
        if (err) {}
        console.log('--compress ' + filePath + ' from ' + oldSize + ' to ' + fileSizeHandler(stats.size));
      });
    });
};

//监控
var watchPng = function(reg) {
  watch.watchTree(process.cwd(), function(f, curr, prev) {
    if (typeof f == "object" && prev === null && curr === null) {
      console.log('watch ' + process.cwd() + '/' + reg);
      schedule.scheduleJob(rule, function() {　　
        compressFileArr();
      });

    } else if (prev === null) {
      // f is a new file
      if (f.indexOf(reg) > -1 && f.indexOf('.png') > -1) {
        var fileObj = {
          'name': f,
          'size': curr.size
        }
        filesAdded.push(fileObj);
      }
    } else if (curr.nlink === 0) {
      // f was removed
    } else {
      // f was changed
      if ((f.indexOf(reg) > -1 && f.indexOf('.png') > -1) || f.indexOf('git/HEAD') > -1) {
        var fileObj = {
          'name': f,
          'size': curr.size
        }
        filesEdited.push(fileObj);
      }
    }
  })
};

program
  .version('0.1.2')
  .option('-m, --mode [mode]', 'site or mobile for shangtongdai', 'm')
  .parse(process.argv);

if (program.mode == 'm') {
  watchPng('src/img');
} else if (program.mode == 'site') {
  watchPng('site/public/images');
} else {
  watchPng(program.mode);
}