const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const crypto = require("crypto");
require("dotenv").config();

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// Dynamic template & asset path resolver (supports nested and flat layouts)
const viewDir = fs.existsSync(path.join(__dirname, "views")) ? path.join(__dirname, "views") : __dirname;
const publicDir = fs.existsSync(path.join(__dirname, "public")) ? path.join(__dirname, "public") : __dirname;

app.use(express.static(publicDir));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", viewDir);

// Configure session management for user authentication state
app.use(session({
  secret: process.env.SESSION_SECRET || "cs312-super-secret-key-2026",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day session
}));

// Pass active user context to all templates
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// Bonus Challenge: Password hashing helper (MD5 per specification)
function hashSecret(plain) {
  return crypto.createHash("md5").update(String(plain).trim()).digest("hex");
}

function verifySecret(inputPlain, storedPassword) {
  const hashedInput = hashSecret(inputPlain);
  // Match both hashed format and legacy/pgAdmin plaintext input
  return storedPassword === hashedInput || storedPassword === inputPlain;
}


// Authentication Routes

// Render signup form
app.get("/signup", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("signup", { errorMsg: null, prevUserId: "", prevName: "" });
});

// Process signup form submission
app.post("/signup", async (req, res) => {
  const { user_id, password, name } = req.body;
  const cleanId = (user_id || "").trim();
  const cleanName = (name || "").trim();
  const cleanPass = (password || "").trim();

  if (!cleanId || !cleanPass || !cleanName) {
    return res.render("signup", { 
      errorMsg: "Please fill out all required fields.",
      prevUserId: cleanId,
      prevName: cleanName
    });
  }

  try {
    // Check if user_id is already registered
    const existing = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [cleanId]);
    if (existing.rows.length > 0) {
      return res.render("signup", {
        errorMsg: "This User ID is already taken. Please choose a different one.",
        prevUserId: "",
        prevName: cleanName
      });
    }

    // Insert new user record with hashed password
    const hashed = hashSecret(cleanPass);
    await pool.query(
      "INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)",
      [cleanId, hashed, cleanName]
    );

    console.log(`[AUTH] New user account created: ${cleanId} (${cleanName})`);
    res.redirect("/signin?registered=true");
  } catch (err) {
    console.error("Database error during signup:", err.message);
    res.render("signup", {
      errorMsg: "A database error occurred. Ensure PostgreSQL is running with BlogDB created.",
      prevUserId: cleanId,
      prevName: cleanName
    });
  }
});

// Render signin form
app.get("/signin", (req, res) => {
  if (req.session.user) return res.redirect("/");
  const successMsg = req.query.registered ? "Account created successfully! Please sign in below." : null;
  res.render("signin", { errorMsg: null, successMsg: successMsg, prevUserId: "" });
});

// Process signin form submission
app.post("/signin", async (req, res) => {
  const { user_id, password } = req.body;
  const cleanId = (user_id || "").trim();
  const cleanPass = (password || "").trim();

  if (!cleanId || !cleanPass) {
    return res.render("signin", {
      errorMsg: "Please provide both User ID and Password.",
      successMsg: null,
      prevUserId: cleanId
    });
  }

  try {
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [cleanId]);
    if (result.rows.length === 0) {
      return res.render("signin", {
        errorMsg: "Invalid User ID or password. Please try again.",
        successMsg: null,
        prevUserId: cleanId
      });
    }

    const matchedUser = result.rows[0];
    if (!verifySecret(cleanPass, matchedUser.password)) {
      return res.render("signin", {
        errorMsg: "Invalid User ID or password. Please try again.",
        successMsg: null,
        prevUserId: cleanId
      });
    }

    // Store authenticated identity in session
    req.session.user = {
      user_id: matchedUser.user_id,
      name: matchedUser.name
    };

    console.log(`[AUTH] User signed in: ${matchedUser.user_id}`);
    res.redirect("/");
  } catch (err) {
    console.error("Database error during signin:", err.message);
    res.render("signin", {
      errorMsg: "Could not connect to PostgreSQL. Verify BlogDB is running.",
      successMsg: null,
      prevUserId: cleanId
    });
  }
});

// Sign out route
app.get("/signout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Bonus Challenge: Account management page
app.get("/account", (req, res) => {
  if (!req.session.user) return res.redirect("/signin");
  res.render("account", { errorMsg: null, successMsg: null });
});

app.post("/account", async (req, res) => {
  if (!req.session.user) return res.redirect("/signin");

  const currentId = req.session.user.user_id;
  const { name, new_user_id, new_password } = req.body;
  const cleanName = (name || "").trim();
  const cleanNewId = (new_user_id || "").trim();
  const cleanNewPass = (new_password || "").trim();

  if (!cleanName || !cleanNewId) {
    return res.render("account", { errorMsg: "Name and User ID cannot be blank.", successMsg: null });
  }

  try {
    // If changing user_id, check if collision exists
    if (cleanNewId !== currentId) {
      const check = await pool.query("SELECT user_id FROM users WHERE user_id = $1", [cleanNewId]);
      if (check.rows.length > 0) {
        return res.render("account", { errorMsg: "That User ID is already taken by someone else.", successMsg: null });
      }
    }

    // Update query with or without password
    if (cleanNewPass.length > 0) {
      const hashed = hashSecret(cleanNewPass);
      await pool.query(
        "UPDATE users SET user_id = $1, name = $2, password = $3 WHERE user_id = $4",
        [cleanNewId, cleanName, hashed, currentId]
      );
    } else {
      await pool.query(
        "UPDATE users SET user_id = $1, name = $2 WHERE user_id = $3",
        [cleanNewId, cleanName, currentId]
      );
    }

    // Also update creator_name in blogs if name was updated
    await pool.query("UPDATE blogs SET creator_name = $1 WHERE creator_user_id = $2", [cleanName, cleanNewId]);

    // Refresh session state
    req.session.user = { user_id: cleanNewId, name: cleanName };

    console.log(`[AUTH] Account updated for ${cleanNewId}`);
    res.render("account", { errorMsg: null, successMsg: "Your account credentials have been updated successfully!" });
  } catch (err) {
    console.error("Account update error:", err.message);
    res.render("account", { errorMsg: "Failed to update account in database.", successMsg: null });
  }
});



// Blog Processes


// Step 6: Post Viewing
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM blogs ORDER BY date_created DESC");
    res.render("index", { 
      posts: result.rows, 
      successMsg: req.query.msg || null, 
      errorMsg: req.query.err || null 
    });
  } catch (err) {
    console.error("Failed to query blogs table:", err.message);
    res.render("index", { 
      posts: [], 
      successMsg: null, 
      errorMsg: "Database connection failed. Please ensure PostgreSQL and BlogDB are running (run database/schema.sql in pgAdmin)." 
    });
  }
});

// Step 5: Post Creation (Insert into blogs table using SQL INSERT)
app.post("/posts", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const { title, body } = req.body;
  const cleanTitle = (title || "").trim();
  const cleanBody = (body || "").trim();

  if (!cleanTitle || !cleanBody) {
    return res.redirect("/?err=Title+and+content+cannot+be+empty");
  }

  try {
    await pool.query(
      "INSERT INTO blogs (creator_name, creator_user_id, title, body, date_created) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)",
      [req.session.user.name, req.session.user.user_id, cleanTitle, cleanBody]
    );

    console.log(`[BLOG] Post created: "${cleanTitle}" by ${req.session.user.user_id}`);
    res.redirect("/?msg=Post+published+successfully!");
  } catch (err) {
    console.error("Error creating post in PostgreSQL:", err.message);
    res.redirect("/?err=Failed+to+save+post+to+database");
  }
});

// Step 7: Post Editing - Form Loader (Enforce creator ownership check)
app.get("/posts/:id/edit", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const blogId = parseInt(req.params.id, 10);
  if (isNaN(blogId)) return res.redirect("/");

  try {
    const result = await pool.query("SELECT * FROM blogs WHERE blog_id = $1", [blogId]);
    if (result.rows.length === 0) {
      return res.redirect("/?err=Post+not+found");
    }

    const post = result.rows[0];

    // Authorization check: only the creator can edit
    if (post.creator_user_id !== req.session.user.user_id) {
      console.warn(`[AUTH_BLOCK] User ${req.session.user.user_id} attempted to edit post ${blogId} owned by ${post.creator_user_id}`);
      return res.status(403).render("index", {
        posts: [],
        successMsg: null,
        errorMsg: "Access denied: You can only edit posts you created."
      });
    }

    res.render("edit", { post: post, errorMsg: null });
  } catch (err) {
    console.error("Error fetching post for edit:", err.message);
    res.redirect("/?err=Error+loading+post");
  }
});

// Step 7: Post Editing - Save Updates via SQL UPDATE
app.post("/posts/:id/edit", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const blogId = parseInt(req.params.id, 10);
  const { title, body } = req.body;
  const cleanTitle = (title || "").trim();
  const cleanBody = (body || "").trim();

  if (isNaN(blogId) || !cleanTitle || !cleanBody) {
    return res.redirect("/");
  }

  try {
    // SQL UPDATE with creator_user_id constraint to prevent unauthorized mutation
    const updateResult = await pool.query(
      "UPDATE blogs SET title = $1, body = $2 WHERE blog_id = $3 AND creator_user_id = $4 RETURNING blog_id",
      [cleanTitle, cleanBody, blogId, req.session.user.user_id]
    );

    if (updateResult.rows.length === 0) {
      return res.redirect("/?err=Update+failed+or+unauthorized");
    }

    console.log(`[BLOG] Post ${blogId} updated by ${req.session.user.user_id}`);
    res.redirect("/?msg=Post+updated+successfully!");
  } catch (err) {
    console.error("Error updating post in database:", err.message);
    res.redirect("/?err=Failed+to+update+post");
  }
});

// Step 8: Post Deletion via SQL DELETE 
app.post("/posts/:id/delete", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/signin");
  }

  const blogId = parseInt(req.params.id, 10);
  if (isNaN(blogId)) return res.redirect("/");

  try {
    // SQL DELETE restricted to the current user's creator_user_id
    const deleteResult = await pool.query(
      "DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2 RETURNING blog_id",
      [blogId, req.session.user.user_id]
    );

    if (deleteResult.rows.length === 0) {
      return res.redirect("/?err=Delete+failed+or+unauthorized");
    }

    console.log(`[BLOG] Post ${blogId} permanently deleted by ${req.session.user.user_id}`);
    res.redirect("/?msg=Post+deleted+successfully!");
  } catch (err) {
    console.error("Error deleting post from database:", err.message);
    res.redirect("/?err=Failed+to+delete+post");
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).redirect("/");
});

// Startup check & server listener
app.listen(PORT, async () => {
  console.log(`   CS 312 BlogDB Server running at http://localhost:${PORT}`);

  // Test database connection
  try {
    const res = await pool.query("SELECT current_database(), current_user");
    console.log(`  Connected to PostgreSQL Database: ${res.rows[0].current_database} as ${res.rows[0].current_user}`);
  } catch (err) {
    console.warn(`  [Notice] PostgreSQL connection notice: ${err.message}`);
    console.warn(`  Please ensure PostgreSQL is running and database/schema.sql is executed in pgAdmin.`);
  }
});
