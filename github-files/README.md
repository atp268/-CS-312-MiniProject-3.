# 📝 CS 312 Mini-Project-3: PostgreSQL Blog with Authentication

An enhanced full-stack blog web application built with **Node.js**, **Express.js**, **EJS**, and **PostgreSQL**. 

This project expands upon Mini-Project-1 by introducing a relational database (`BlogDB`) for permanent data persistence, user authentication (Sign Up / Sign In / Sign Out), session management with `express-session`, and ownership authorization so users can only update or delete their own posts.

---

## 🌟 Key Features

- **PostgreSQL Database Integration**: Persistent storage for all blog posts and user records across server restarts.
- **Relational Schema**: `blogs` table with foreign key (`creator_user_id`) referencing the `users` table (`user_id`).
- **User Authentication**: Dedicated EJS pages for **Sign Up** (`/signup`) and **Sign In** (`/signin`).
- **Authorization & Ownership Control**: Users can only edit (`/posts/:id/edit`) and delete (`/posts/:id/delete`) blog posts that they created.
- **Session Persistence**: Sessions maintained seamlessly with `express-session`.
- **Preloaded Seed Data**: Schema includes 3 initial users and 5 realistic blog entries.
- **Bonus Challenge Completed**:
  - **Password Hashing**: Passwords stored as encrypted hashes (MD5) using Node.js `crypto`.
  - **Account Management**: Authenticated users can visit `/account` to update their display name, user ID, and password.

---

## 📁 Project Structure

```text
cs312-miniproject-3/
├── index.js              # Express app, authentication routes, and SQL queries
├── db.js                 # PostgreSQL connection pool configuration
├── package.json          # Node dependencies (pg, express, ejs, express-session, dotenv)
├── .env.example          # Environment variable template
├── .gitignore            # Excludes node_modules and .env
├── README.md             # Project documentation and setup guide
├── database/
│   └── schema.sql        # Table definitions and seed data for pgAdmin
├── public/
│   └── styles.css        # Clean, responsive CSS stylesheet
└── views/
    ├── index.ejs         # Blog feed & post creation form with user status
    ├── signup.ejs        # User registration form
    ├── signin.ejs        # User login form
    ├── edit.ejs          # Post editing form
    └── account.ejs       # Bonus: Account profile & credentials updater
```

---

## 🗄️ Database Setup (pgAdmin)

1. Open **pgAdmin** and connect to your local PostgreSQL server.
2. In the Object Explorer on the left, right-click **Databases** ➔ **Create** ➔ **Database...**
3. Set the Database name to **`BlogDB`** and click **Save**.
4. Right-click on **`BlogDB`** ➔ select **Query Tool**.
5. Open or copy the contents of `database/schema.sql` into the Query Tool.
6. Click the **Execute/Run** button (or press `F5`).
7. Verify that the tables `users` and `blogs` are created with initial rows!

### Pre-seeded User Accounts for Testing:
| User ID | Password | Name |
| :--- | :--- | :--- |
| `alice_coder` | `password123` | Alice Johnson |
| `bob_builder` | `securePass456` | Bob Smith |
| `charlie_cs` | `campusAdmin789` | Charlie Davis |

---

## 💻 Running Locally

### 1. Configure `.env`
Create a `.env` file (or copy `.env.example`) with your PostgreSQL password:
```env
PORT=3000
PG_USER=postgres
PG_PASSWORD=your_postgres_password
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=BlogDB
SESSION_SECRET=cs312-super-secret-key-2026
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```

Visit: **http://localhost:3000**
