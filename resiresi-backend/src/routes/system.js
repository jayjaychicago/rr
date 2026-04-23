import { Router } from 'express';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from '../db/pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

router.get('/healthz', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'ok', db: 'error' });
  }
});

router.get('/openapi.yaml', async (req, res, next) => {
  try {
    const yamlPath = join(__dirname, '../../openapi.yaml');
    const content = await readFile(yamlPath, 'utf8');
    res.setHeader('Content-Type', 'application/yaml');
    res.send(content);
  } catch (err) {
    next(err);
  }
});

router.get('/docs', async (req, res, next) => {
  try {
    const baseUrl = process.env.PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 8080}`;
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html>
<head>
  <title>ResiResi API Docs</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" >
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"> </script>
<script>
window.onload = function() {
  SwaggerUIBundle({
    url: "${baseUrl}/openapi.yaml",
    dom_id: '#swagger-ui',
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
    layout: "BaseLayout"
  });
}
</script>
</body>
</html>`);
  } catch (err) {
    next(err);
  }
});

export default router;
