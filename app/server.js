const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;

const pool = new Pool();

let baseConnectee = false;
let dernierMessage = "";

const FILM_PRESENT = [
  ["Big Fish & Begonia", 2016, "Adventure"],
  ["Ultraman: Rising", 2024, "Family"],
];

pool.on("error", (err) => {
  console.error("Base : connexion lost (" + err.message + ")");
  baseConnectee = false;
  setTimeout(connecterLaBase, 2000);
});

async function connecterLaBase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS films (
        id serial PRIMARY KEY,
        title text NOT NULL,
        release_date int NOT NULL,
        genre text NOT NULL,
        cree_le timestamptz DEFAULT now()
      )
    `);

    const { rows } = await pool.query("SELECT count(*)::int AS total FROM films");
    if (rows[0].total === 0) {
      for (const [title, release_date, genre] of FILM_PRESENT) {
        await pool.query(
          "INSERT INTO films (title, release_date, genre) VALUES ($1, $2, $3)",
          [title, release_date, genre]
        );
      }
      console.log("Base : données de départ ajoutées");
    }

    baseConnectee = true;
    console.log("Base : connected");
  } catch (err) {
    baseConnectee = false;
    const message = "Base : not connected (" + err.message + "), try every 2 s";
    if (message !== dernierMessage) console.log(message);
    dernierMessage = message;
    setTimeout(connecterLaBase, 2000);
  }
}

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/sante", (req, res) => {
  res.json({
    api: "ok",
    base: baseConnectee ? "connected" : "not connected",
    conteneur: os.hostname(),
  });
});

app.get("/api/films", async (req, res) => {
  if (!baseConnectee) {
    return res.status(503).json({ erreur: "base not connected" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, title, release_date, genre FROM films ORDER BY release_date, id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

app.post("/api/film", async (req, res) => {
  if (!baseConnectee) {
    return res.status(503).json({ erreur: "base not connected" });
  }

  const { title, release_date, genre } = req.body || {};
  if (!title || !release_date || !genre) {
    return res.status(400).json({ erreur: "title, release_date, genre are necessary" });
  }

  try {
    const { rows } = await pool.query(
      "INSERT INTO films (title, release_date, genre) VALUES ($1, $2, $3) RETURNING id, title, release_date, genre",
      [title, release_date, genre]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ erreur: err.message });
  }
});

app.listen(PORT, () => {
  console.log("titles : application started on port " + PORT);
  connecterLaBase();
});

process.on("SIGTERM", () => {
  console.log("titles : closing requested, goodbye");
  process.exit(0);
});
