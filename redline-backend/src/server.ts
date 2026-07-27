import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { watchManager } from "./engine/watcher.js";
import { persistScan, persistRemoval } from "./db/detectionRepo.js";

// Branche la persistance Postgres sur le watcher (le moteur reste découplé de la
// DB : il ne connaît que cette interface, injectée ici au démarrage du serveur).
watchManager.setPersistence({ onScan: persistScan, onRemove: persistRemoval });

const app = createApp();

app.listen(env.port, () => {
  console.log(`redline backend-express en écoute sur http://localhost:${env.port}`);
});
