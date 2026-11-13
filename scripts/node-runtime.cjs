// Some Windows environments cannot resolve the account name through libuv.
// tsx only needs it for its local cache folder. Preserve the native result when available.
const os = require('node:os');
if (process.platform === 'win32') {
  // Keep Node and tsx temporary files on the same drive as this project.
  const tempDirectory = require('node:path').resolve(__dirname, '..', '.local-backups', 'npm-temp');
  require('node:fs').mkdirSync(tempDirectory, { recursive: true });
  process.env.TEMP = tempDirectory;
  process.env.TMP = tempDirectory;

  const nativeUserInfo = os.userInfo;
  try {
    nativeUserInfo();
  } catch (error) {
    if (error.code !== 'ERR_SYSTEM_ERROR' || error.info?.syscall !== 'uv_os_get_passwd') throw error;
    os.userInfo = function (options) {
      try { return nativeUserInfo.call(os, options); }
      catch (failure) {
        if (failure.code !== 'ERR_SYSTEM_ERROR' || failure.info?.syscall !== 'uv_os_get_passwd') throw failure;
        const username = String(process.env.USERNAME || 'local').replace(/[^a-zA-Z0-9_.-]/g, '_');
        return {username, homedir: os.homedir(), uid: -1, gid: -1, shell: null};
      }
    };
  }
}
