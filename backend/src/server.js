import { config } from "./config.js";
import app from "./app.js";

app.listen(config.port, () => {
  console.log(`Briefing backlog backend listening on http://localhost:${config.port}`);
});
