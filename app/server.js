server

server.js

// ---------------------------------------------------------------------------
// Liste de films
//
// Ce qu'elle fait :
//   - elle affiche une page web (public/index.html) ;
//   - elle se connecte à une base PostgreSQL si on lui dit où la trouver ;
//   - elle liste et enregistre des réservations de titles.
// ---------------------------------------------------------------------------

const os = require("node:os");
const path = require("node:path");
const express = require("express");
const { Pool } = require("pg");

// Le port sur lequel l'application écoute. 3000 si on ne précise rien.
const PORT = process.env.PORT || 3000;

// La connexion à la base.
// On ne met AUCUN mot de passe ici : la librairie "pg" lit toute seule les
// variables d'environnement PGHOST, PGPORT, PGUSER, PGPASSWORD et PGDATABASE.
// C'est Docker qui les fournira.
const pool = new Pool();

// Évite que l'application plante si la base disparaît en cours de route.
pool.on("error", (err) => {
  console.error("Base : connexion lost (" + err.message + ")");
  baseConnectee = false;
  setTimeout(connecterLaBase, 2000);
});

let baseConnectee = false;
let dernierMessage = "";

// Quelques réservations inventées, ajoutées si la table est vide.
const FILM_PRESENT = [
  ["Big Fish & Begonia", "2016", "Adventure"],
  ["Ultraman: Rising", "2024", "Family"]
];

// Se connecte à la base, crée la table si besoin et ajoute les données de départ.
// Si la base n'est pas joignable, on réessaie toutes les 2 secondes
// au lieu de planter : l'application reste utilisable sans base.
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

    const { rows } = await pool.query("SELECT count(*)::int AS total FROM film");
    if (rows[0].total === 0) {
      for (const r of FILM_PRESENT) {
        await pool.query(
          "INSERT INTO film (title, release_date, genre) VALUES ($1, $2, $3, $4)",
          r
        );
      }
      console.log("Base : film's table");
    }

    baseConnectee = true;
    console.log("Base : connected");
  } catch (err) {
    baseConnectee = false;
    // On n'affiche le message que s'il change, pour ne pas inonder les logs.
    const message = "Base : not connected (" + err.message + "), try every 2 s";
    if (message !== dernierMessage) console.log(message);
    dernierMessage = message;
    setTimeout(connecterLaBase, 2000);
  }
}

const app = express();
app.use(express.json());

// La page web.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// L'état de l'application. "conteneur" est le nom de la machine :
// dans Docker, c'est l'identifiant du conteneur.
app.get("/api/sante", (req, res) => {
  res.json({
    api: "ok",
    base: baseConnectee ? "connected" : "not connected",
    conteneur: os.hostname(),
  });
});

// La liste des réservations.
app.get("/api/films", async (req, res) => {
  if (!baseConnectee) {
    return res.status(503).json({ erreur: "base not connected" });
  }
  try {
    const { rows } = await pool.query(
      "SELECT id, title, release_date, genre FROM film ORDER BY release_date, id"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erreur: err.message });
  }
});

// Ajouter une réservation.
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
      "INSERT INTO film (title, release_date, genre) VALUES ($1, $2, $3, $4) RETURNING id, title, release_date, genre",
      [title, release_date, genre]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ erreur: err.message });
  }
});

// On démarre le serveur web tout de suite, puis on tente la base en tâche de fond.
app.listen(PORT, () => {
  console.log("titles : application démarrée sur le port " + PORT);
  connecterLaBase();
});

// Arrêt propre quand Docker demande au conteneur de s'arrêter (docker stop).
process.on("SIGTERM", () => {
  console.log("titles : arrêt demandé, au revoir");
  process.exit(0);
});
