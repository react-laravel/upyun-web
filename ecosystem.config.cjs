module.exports = {
  apps: [
    {
      name: process.env.PM2_APP || "upyun-web",
      cwd: process.env.PM2_CWD || __dirname,
      script: "server/index.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "3003",
        PATH: "/home/actions-runner/.nvm/versions/node/v24.16.0/bin:/home/actions-runner/.local/bin:/usr/local/bin:/usr/bin:/bin",
      },
      error_file: (process.env.APP_ROOT || "/var/www/upyun-web") + "/logs/error.log",
      out_file: (process.env.APP_ROOT || "/var/www/upyun-web") + "/logs/out.log",
      merge_logs: true,
      max_memory_restart: "512M",
    },
  ],
};
