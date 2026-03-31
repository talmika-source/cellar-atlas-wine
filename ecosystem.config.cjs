module.exports = {
  apps: [
    {
      name: "cellar-atlas-wine",
      script: "npm",
      args: "start",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
