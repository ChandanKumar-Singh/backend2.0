module.exports = {
  apps: [
    {
      name: 'enterprise-backend',
      script: 'dist/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '127.0.0.1',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '127.0.0.1',
      },
      // Restart options
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',

      // Logging
      log_file: './logs/combined.log',
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Monitoring
      monitoring: false,
      pmx: true,

      // Advanced options
      kill_timeout: 1600,
      listen_timeout: 8000,
      shutdown_with_message: true,

      // Memory management
      max_memory_restart: '1G',

      // Auto restart on file changes (development only)
      watch: false,
      ignore_watch: ['node_modules', 'logs'],

      // Source map support
      source_map_support: true,

      // Cron restart
      cron_restart: '0 0 * * *', // Restart daily at midnight

      // Health check
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,

      // Environment variables
      env_file: '..env.template',
    },
  ],

  deploy: {
    production: {
      user: 'ubuntu',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/enterprise-backend.git',
      path: '/var/www/enterprise-backend',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      'ssh_options': 'ForwardAgent=yes',
    },
    staging: {
      user: 'ubuntu',
      host: 'your-staging-server-ip',
      ref: 'origin/develop',
      repo: 'https://github.com/your-username/enterprise-backend.git',
      path: '/var/www/enterprise-backend-staging',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env staging',
      env: {
        NODE_ENV: 'staging',
        PORT: 5000,
      },
    },
  },
};
