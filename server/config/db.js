const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT || 3306,
  user: process.env.DATABASE_USERNAME || 'admin',
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME || 'peer2peer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  },
  connectTimeout: 60000,
  timezone: '+08:00',
  dateStrings: true,
  charset: 'utf8mb4'
});

pool.getConnection()
  .then(conn => {
    console.log('MySQL connected successfully using connection pool.');
    
    return conn.execute(`SET time_zone = '+08:00'`)
      .then(() => {
        console.log('Database timezone set to +08:00 (Asia/Shanghai)');
        conn.release();
      });
  })
  .catch(err => {
    console.error('MySQL connection pool failed:', err.message);
  });

module.exports = pool;