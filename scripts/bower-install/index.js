// TODO:
// Requires bower node_module to be prepared and within the fsRoot
// 

// third-party
const Bluebird = require('bluebird');
const posix = require('posix');
const bower = require('bower');

// own
const options = require('./options');

if (!options.fsRoot) {
  throw new Error('fsRoot is required');
}

options.packages = options.packages || [];

return new Bluebird((resolve, reject) => {
  
  // chroot
  posix.chroot(options.fsRoot);
  process.chdir('/');

  var installOptions = {
    forceLatest: true,
  };
  
  var installConfig = {
    // cwd is always the root, as we are within a chroot
    cwd: '/',
    interactive: false,
  };
  
  bower.commands.install(
    options.packages,
    installOptions,
    installConfig
  )
  .on('error', reject)
  .on('end', resolve);
})
.then((results) => {
  console.log(results);
  process.exit(0);
})
.catch((err) => {
  console.warn(err.stack);
  process.exit(1);
});
