module.exports = {
    apps: [
        {
            name: 'burgieclan-frontend',
            script: 'node_modules/.bin/next',
            args: 'start -p 3000',
            interpreter: 'node',
            instances: 'max',              // Use maximum number of CPU cores
            exec_mode: 'cluster',          // Run in cluster mode for better performance
            watch: false,                  // Disable watch mode in production
            max_memory_restart: '1000M',   // Restart if memory exceeds 1GB
            env: {
                NODE_ENV: 'production',
                PORT: 3000
            },
            merge_logs: true,              // Merge logs from all instances
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            error_file: './logs/error.log',  // Error log path
            out_file: './logs/out.log',      // Output log path
            autorestart: true,             // Auto restart if app crashes
            max_restarts: 10,              // Maximum number of restarts
            restart_delay: 4000,           // Delay between restarts
            source_map_support: false,     // Disable source map in production
            time: true,                    // Add timestamps to logs
        }
    ]
};
