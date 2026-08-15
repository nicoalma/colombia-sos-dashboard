# Colombia SOS — Agregador de iniciativas

Un dashboard editorial que agrega **todas las iniciativas de ayuda** que surgieron tras el terremoto en Colombia — mapas SOS, impresión 3D de férulas, donaciones por zona, guías legales de seguros — para que ninguna se quede solo en un video de Instagram o TikTok.

**Principio de diseño:** un solo archivo de datos (`data/initiatives.json`), legible por humanos y por IAs, y una interfaz que filtra por *quién eres* (afectado, donante, voluntario, organización).

## Cómo correrlo

Es un sitio estático sin dependencias ni build:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

Desplegado en Vercel (framework preset "Other", sin build): cada push a `main` publica producción y cada PR genera una URL de preview.

## Modelo de datos

Todo vive en `data/initiatives.json`, validable contra `data/initiatives.schema.json`. Cada iniciativa:

| Campo | Qué guarda | Por qué importa |
|---|---|---|
| `id` | Identificador estable (`sos-mapa-001`) | Referencias, dedupe, futuro MCP |
| `title`, `summary` | Nombre y descripción corta | Lo que ve la gente |
| `category` | Una de: `sos`, `salud`, `donaciones`, `albergue`, `suministros`, `legal`, `mascotas`, `reconstruccion`, `informacion` | Filtro principal |
| `audiences` | A quién sirve: `afectado`, `donante`, `voluntario`, `organizacion` | El filtro "¿quién eres?" |
| `zones` | Departamentos/ciudades o `Nacional` | Filtro geográfico |
| `organizer` | `{ name, type }` — ciudadano, colectivo, ong, gobierno, empresa | Confianza y contexto |
| `links` | `[{ type, url, label }]` — web, instagram, tiktok, whatsapp, telefono, formulario | El llamado a la acción |
| `needs` / `offers` | Qué necesita la iniciativa / qué ofrece | Match oferta ↔ necesidad |
| `status` | `activa`, `pausada`, `finalizada` | Ciclo de vida |
| `verification` | `{ state, lastCheckedAt, checkedBy, source }` — `verificada`, `por_verificar`, `desactualizada` | El corazón del agregador: saber si la info sigue viva. Pensado para que una IA lo refresque. |
| `tags`, `createdAt`, `updatedAt` | Metadatos | Búsqueda y auditoría |

La separación `status` (¿la iniciativa existe?) vs `verification` (¿la información está al día?) es deliberada: permite que un agente de IA revise periódicamente los links/redes y actualice `verification` sin tocar el contenido editorial.

## Actualización automática 🤖

El feed **se mantiene solo** vía `.github/workflows/refresh-data.yml` (2 veces al día):

1. `scripts/check-links.mjs` prueba cada link del feed (evidencia determinística).
2. `scripts/refresh-initiatives.mjs` — Claude con búsqueda web verifica cada iniciativa y descubre nuevas. **Por diseño, la IA solo puede tocar `status`/`verification` y proponer nuevas entradas como `por_verificar`** — nunca modifica links, títulos ni resúmenes existentes (así una página comprometida no puede reescribir un link de donación).
3. `scripts/validate.mjs` valida contra el esquema.
4. Los cambios llegan como **PR con resumen** que un humano aprueba (y Vercel le genera preview).

Requiere el secret `ANTHROPIC_API_KEY` (el mismo que usa OpenWiki).

Las propuestas de la comunidad entran por el [formulario estructurado](https://github.com/nicoalma/colombia-sos-dashboard/issues/new?template=nueva-iniciativa.yml) y se revisan antes de publicarse.

## Roadmap

- **Servidor MCP** que exponga `initiatives.json` como recurso consultable desde cualquier IA (el JSON ya es la API; en Vercel basta agregar una carpeta `api/`).
- **Bot que convierta issues de propuesta en PRs** con el registro ya formateado.

## ⚠️ Sobre los datos

Las iniciativas provienen de **fuentes públicas** (prensa, canales oficiales de alcaldías y ONG) recopiladas tras el sismo del 10 de agosto de 2026; cada entrada registra su fuente en `verification.source`. Por seguridad, **el feed nunca transcribe números de cuenta bancaria** — siempre enlaza a la página oficial o de prensa donde están publicados. Las entradas `por_verificar` esperan confirmación directa con la organización.
