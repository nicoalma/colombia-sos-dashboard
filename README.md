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

## Roadmap (ideas ya contempladas en el diseño)

- **Servidor MCP** que exponga `initiatives.json` como recurso consultable desde cualquier IA (el JSON ya es la API).
- **Agente de seguimiento** que visite links/redes periódicamente y actualice `verification.state` y `lastCheckedAt`.
- **Formulario de envío** → cada propuesta entra como PR o issue y se revisa antes de publicarse (el botón "Proponer iniciativa" ya existe en el UI).

## ⚠️ Datos de demostración

Las iniciativas incluidas son **ejemplos con enlaces de relleno** basados en casos reales mencionados; hay que reemplazarlas con datos verificados antes de publicar.
