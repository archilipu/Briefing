# Backend MVP real

Starter backend para pasar de la demo con `localStorage` a una version real con
API HTTP y PostgreSQL.

## Objetivo

Garantizar tecnicamente que cada persona vote una sola vez el mismo tema dentro
del mismo briefing.

## Como funciona la validacion real

1. El usuario inicia sesion como `empleado` o `admin`.
2. El backend crea una sesion y devuelve un `Bearer token`.
3. El endpoint de voto usa la sesion del empleado.
4. PostgreSQL bloquea votos duplicados con:

```sql
unique (user_id, topic_id, briefing_id)
```

5. Si el voto ya existe, la API responde `409`.

## Identidad del usuario en este starter

- `empleado`: login por numero de empleado autorizado.
- `admin`: login por `ADMIN_USERNAME` y `ADMIN_PASSWORD`.

La sesion se envia asi:

```http
Authorization: Bearer <session_token>
```

## Rutas principales

- `GET /api/public/briefing`
- `POST /api/public/topics`
- `POST /api/public/votes`
- `POST /api/auth/login/employee`
- `POST /api/auth/login/admin`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/admin/briefings`
- `POST /api/admin/briefings`
- `PATCH /api/admin/briefings/:id`
- `DELETE /api/admin/briefings/:id`
- `GET /api/admin/tracking/briefings/:id`
- `PATCH /api/admin/topics/:id`
- `GET /api/admin/employees`
- `POST /api/admin/employees`
- `POST /api/admin/employees/bulk`
- `DELETE /api/admin/employees/:employeeId`

## Puesta en marcha

1. Crear base de datos PostgreSQL.
2. Ejecutar [init.sql](/C:/NTT/NTT%20DATA%20EMEAL/Service%20Management%20Office%20IS%20-%20Transformaci%C3%B3n/04.%20Herramientas/CODEX/backend/sql/init.sql).
3. Copiar `.env.example` a `.env`.
4. Copiar el frontend [briefing-config.js](/C:/NTT/NTT%20DATA%20EMEAL/Service%20Management%20Office%20IS%20-%20Transformaci%C3%B3n/04.%20Herramientas/CODEX/briefing-config.js) y poner la URL real del backend.
5. Ejecutar `npm install`.
6. Ejecutar `npm run dev`.

## Integracion recomendada con el frontend

- Login empleado debe usar `POST /api/auth/login/employee`.
- Login admin debe usar `POST /api/auth/login/admin`.
- `Votacion` debe cargar `GET /api/public/briefing`.
- Crear tema debe hacer `POST /api/public/topics`.
- Votar debe hacer `POST /api/public/votes`.
- `Administracion` debe usar `GET/POST/PATCH /api/admin/briefings`.
- `Seguimiento` debe usar `GET /api/admin/tracking/briefings/:id` y `PATCH /api/admin/topics/:id`.
- Gestion de empleados debe usar `GET/POST/DELETE /api/admin/employees`.
