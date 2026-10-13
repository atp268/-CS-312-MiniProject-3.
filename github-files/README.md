# CS 312 Mini-Project-3: PostgreSQL Blog

An enhanced full-stack blog web application built with **Node.js**, **Express.js**, **EJS**, and **PostgreSQL**. 

This project expands upon Mini-Project-1 by introducing a relational database (`BlogDB`) for permanent data persistence, user authentication (Sign Up / Sign In / Sign Out), session management with `express-session`, and ownership authorization so users can only update or delete their own posts.


---

## Database Setup (pgAdmin)

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

## Running Locally

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
