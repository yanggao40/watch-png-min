#!/usr/bin/env node

var program = require('commander');
var watch = require('watch')
var Imagemin = require('imagemin');
var imageminPngquant = require('imagemin-pngquant');

var dirOfInterest = process.cwd();
var compressedCache = {};
var pngCompressedInitSize = 'unknown';


var options = {
  interval: 1000,
  ignoreDotFiles: true,
  filter: function(f, stat) {
    var pattern = /.*.png$/;
    return pattern.test(f) || stat.isDirectory();
  }
};

//处理文件大小
var fileSizeHandler = function(size) {
  if (size < 1024) {
    return size + '字节';
  } else if (size < 1024 * 1024) {
    return (size / 1024).toFixed(0) + 'Kb';
  } else {
    return (size / (1024 * 1024)).toFixed(0) + 'Mb';
  }
};

//显示文件改变状态
var fileChangeStatusHandler = function(file, size, status) {
  var name = file;
  if (status == 3) {
    //删除文件
    if (compressedCache && compressedCache[name]) {
      compressedCache.name = null;
    }
    console.log('-------- delete ' + name)
  }
  if (status == 1) {
    //缓存中没有则加入，初始化未压缩
    if (compressedCache && !compressedCache[name]) {
      compressedCache[name] = {
        fileSize: size,
        hasCompressed: false
      };
      console.log('-------- add ' + name + ' the size is ' + fileSizeHandler(size));
      pngCompressHandler(name);
    }
  }
  if (status == 2) {
    //缓存中没有则缓存，初始化未压缩
    if (compressedCache && !compressedCache[name]) {
      compressedCache[name] = {
        fileSize: size,
        hasCompressed: false
      };
      console.log('-------- edit ' + name + ' the size is ' + fileSizeHandler(size));
      pngCompressHandler(name);
    } else if (compressedCache && compressedCache[name] && compressedCache[name]['fileSize'] == pngCompressedInitSize) {
      compressedCache[name]['fileSize'] = size;
    } else {
      pngCompressHandler(name);
    }
  }
};

var pngCompressHandler = function(name) {
  var filePath = name;
  var destPath = filePath.slice(0, filePath.lastIndexOf('/'));
  new Imagemin()
    .src(filePath)
    .dest(destPath)
    .use(imageminPngquant({
      quality: '65-80',
      speed: 4
    }))
    .run();
  compressedCache[name] = {
    fileSize: pngCompressedInitSize,
    hasCompressed: true
  };
  console.log('-------- compress ' + name);
};

var watchPng = function(reg) {
  console.log(process.cwd() + reg);
  watch.createMonitor(process.cwd() + reg, options, function(monitor) {
    monitor.on("created", function(f, stat) {
      fileChangeStatusHandler(f, stat.size, 1);
    })
    monitor.on("changed", function(f, curr, prev) {
      fileChangeStatusHandler(f, curr.size, 2);
    })
    monitor.on("removed", function(f, stat) {
      fileChangeStatusHandler(f, null, 3);
    })
  })
};

program
  .version('0.0.4')
  .option('-m, --mode [mode]', 'site or mobile for shangtongdai', 'm')
  .parse(process.argv);

if (program.mode == 'm') {
  watchPng('/src/img');
} else if (program.mode == 'site') {
  watchPng('/site/public/images');
} else {
  watchPng(program.mode);
}