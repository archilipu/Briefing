# Subir y publicar la app en GitHub

## Importante antes de empezar

La app actual se puede publicar en `GitHub Pages` porque es estatica. Eso sirve
para demo o uso inicial.

Pero el login de admin `lomartin / 12,Briefing?` estaria visible en el codigo si
solo se publica asi. Para uso real y seguro, la opcion correcta es:

- codigo en GitHub;
- frontend estatico o Next.js;
- backend desplegado aparte.

## Opcion 1. Publicar ya la demo en GitHub Pages

### Paso 1. Entrar en tu repositorio

Abre:

[https://github.com/archilipu/Briefing](https://github.com/archilipu/Briefing)

### Paso 2. Subir los archivos

1. Pulsa `Add file`.
2. Pulsa `Upload files`.
3. Arrastra o selecciona estos archivos desde tu carpeta local:

- `index.html`
- `briefing-backlog.html`
- `briefing-backlog.css`
- `briefing-backlog-auth.js`
- `GITHUB-PASO-A-PASO.md`
- cualquier `README` que quieras conservar

4. Abajo, en `Commit changes`, escribe por ejemplo:

```text
Primera version Briefing
```

5. Pulsa `Commit changes`.

### Paso 3. Activar GitHub Pages

1. Dentro del repo, pulsa `Settings`.
2. En el menu lateral, pulsa `Pages`.
3. En `Build and deployment`, elige:

- `Source`: `Deploy from a branch`
- `Branch`: `main`
- `Folder`: `/ (root)`

4. Pulsa `Save`.

### Paso 4. Esperar la publicacion

GitHub tardara uno o dos minutos.

Tu URL deberia quedar asi:

[https://archilipu.github.io/Briefing/](https://archilipu.github.io/Briefing/)

Como `index.html` redirige a `briefing-backlog.html`, entrara directamente en la app.

## Opcion 2. Publicacion correcta para login seguro

Si quieres que solo tu puedas entrar de verdad en `Administracion` y `Seguimiento`,
no publiques solo el frontal en GitHub Pages.

Lo correcto es:

1. Mantener el repo en GitHub.
2. Desplegar el backend de `backend/` en un servicio con Node y PostgreSQL.
3. Cambiar el frontend para consumir esa API.
4. Gestionar el login de admin y los IDs de empleado en servidor.

## Archivos clave de esta version

- [briefing-backlog.html](/C:/NTT/NTT%20DATA%20EMEAL/Service%20Management%20Office%20IS%20-%20Transformaci%C3%B3n/04.%20Herramientas/CODEX/briefing-backlog.html)
- [briefing-backlog.css](/C:/NTT/NTT%20DATA%20EMEAL/Service%20Management%20Office%20IS%20-%20Transformaci%C3%B3n/04.%20Herramientas/CODEX/briefing-backlog.css)
- [briefing-backlog-auth.js](/C:/NTT/NTT%20DATA%20EMEAL/Service%20Management%20Office%20IS%20-%20Transformaci%C3%B3n/04.%20Herramientas/CODEX/briefing-backlog-auth.js)
- [index.html](/C:/NTT/NTT%20DATA%20EMEAL/Service%20Management%20Office%20IS%20-%20Transformaci%C3%B3n/04.%20Herramientas/CODEX/index.html)
