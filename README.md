# Frontend — Sistema de gestión impresión 3D

SPA en **Vue 3 (`<script setup>`) + Quasar + Pinia + Vite**, con dos ámbitos: panel de
**administración** privado y **tienda pública**. Implementa el sistema de diseño **"Additive"**
(dark por defecto, tokens de color/tipografía, motion temático de impresión 3D).

## Puesta en marcha

```bash
npm install
cp .env.example .env      # VITE_API_BASE (default http://localhost:4000/api)
npm run dev               # vite -> http://localhost:5173
npm run build             # -> dist/
npm run preview
```

- Panel admin: `http://localhost:5173/admin` (requiere login) · Tienda: `http://localhost:5173/tienda`
- Necesita el backend corriendo (ver [`../backend/README.md`](../backend/README.md)).

## Variables de entorno

```
VITE_API_BASE=http://localhost:4000/api
```
Única variable. No hay credenciales de R2 en el frontend: la subida de archivos se hace pidiendo
una URL firmada al backend (`/uploads/presign`) y subiendo directo a R2.

## Arquitectura

```
src/
├── main.js               # instala Quasar/Pinia/Router, tema (dark default) y error handler global
├── router/index.js       # rutas lazy + guard global (meta.public / requiresAuth / role)
├── stores/               # auth (sesión), carrito (tienda, localStorage), theme (dark/light)
├── services/api.js       # ÚNICO lugar que conoce las rutas del backend (axios + refresh en 401)
├── composables/          # useCrudResource, useImageUpload, useFileUpload
├── layouts/              # AdminLayout (sidebar + topbar + ⌘K), StoreLayout
├── pages/                # admin/* y tienda/*
├── components/           # LoadingState, ResourceDialog, ItemEditor, StatusBadge, Odometer, CommandPalette
└── styles/               # tokens.css (paleta Additive), additive.css (overrides Quasar + motion), dashboard-unified.css
```

### Convenciones

- **`services/api.js` es el único punto de contacto con el backend.** Ninguna página arma URLs.
  Propaga errores tipados `ApiError { message, code }` vía `unwrap()`.
- **CRUD de páginas** con `useCrudResource` (carga/guardado/errores + shape paginado). El estado de
  UI (diálogos, filtros) vive local con `ref`. Solo la sesión y el tema viven en Pinia.
- **Componentes reutilizables:** `ResourceList` (lista responsiva: **tabla en pantallas grandes,
  tarjetas en chicas** vía `$q.screen`, con paginador integrado y slots `cell-<name>` / `actions` /
  `card`), `RecordDetailDialog` (vista de un registro: campos + slot para historial), `ResourceDialog`
  (formulario declarativo por `fields`, soporta el tipo `image`), `ItemEditor` (líneas de pedido/venta),
  `StatusBadge` (pill con pulso en estados activos), `Odometer` (roll numérico), `CommandPalette` (⌘K).
- **Listados y paginación:** `useCrudResource` maneja **paginación server-side (10 por página)**;
  `reload(filtros)` reinicia a la página 1, `goToPage(p)` navega. Las páginas de lista usan
  `ResourceList` (o una grilla de tarjetas propia en Impresiones/Archivos, que son galerías) y cada
  registro abre su vista de detalle. Los filtros llevan `label` describiendo qué filtran.
- **Prefijo de clases CSS propias:** `i3d-`.

## Subida de imágenes y archivos 3D

- `composables/useImageUpload.js` — imágenes (JPG/PNG/WebP, 5MB). Usado en Productos (`ResourceDialog`
  `type: 'image'`) y Configuración (logo).
- `composables/useFileUpload.js` — genérico: imágenes o **modelos STL/3MF** (50MB, `kind: 'model'`).
  Usado en la Biblioteca de archivos 3D (fotos + archivos de cada versión).

Ambos piden una URL firmada a `POST /uploads/presign` y suben el archivo **directo a R2** con
progreso (XHR). El backend valida tipo/tamaño y firma; el archivo nunca pasa por el server.

> Para probar en local, el bucket R2 debe tener **CORS** que permita `PUT` + header `Content-Type`
> desde `http://localhost:5173`, y su **Public Development URL** (`r2.dev`) activada para ver los
> previews. Ver [`../backend/README.md`](../backend/README.md).

## Sistema de diseño "Additive"

- Tokens en `styles/tokens.css`: dark (default) + light completos. Acentos **naranja "molten"**
  (acción) y **teal "filament"** (datos/precisión); violeta para valores calculados por el sistema.
- Tipografías: **Space Grotesk** (títulos), **Inter** (UI), **JetBrains Mono** (todo dato numérico:
  precios, gramos, tiempos, SKU, versiones).
- Motion temático (con fallback `prefers-reduced-motion`): layer-build reveal, extrusion loader,
  status pulse, odometer, add-to-cart "extrude", desglose de costos en capas.
- Toggle claro/oscuro en la topbar y en la tienda; la preferencia se persiste.
