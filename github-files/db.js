const { Pool } = require("pg");
require("dotenv").config();

// PostgreSQL connection pool configuration
const pool = new Pool({
  user: process.env.PG_USER || "postgres",
  host: process.env.PG_HOST || "localhost",
  database: process.env.PG_DATABASE || "BlogDB",
  password: process.env.PG_PASSWORD || "password",
  port: parseInt(process.env.PG_PORT, 10) || 5432,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client:", err.message);
});

module.exports = pool;
