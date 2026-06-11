# Configuración de Supabase — Go Polo
## Proyecto: `inlmzasbkhngqamduugq` · gopolo.app

Este documento describe el estado correcto de configuración de Supabase para que la aplicación funcione correctamente. Si algo deja de funcionar (Realtime, sonido, actualización automática), verificar y restaurar usando los scripts de esta carpeta.

---

## 1. Row Level Security (RLS)

**Estado correcto: DESHABILITADO en todas las tablas.**

Go Polo no usa RLS porque la seguridad se maneja a nivel de aplicación (autenticación Supabase Auth, validaciones en Edge Functions y RPCs). Si RLS se habilita por error en alguna tabla, el Realtime deja de funcionar para usuarios no autenticados (público general).

### Tablas y estado esperado

| Tabla | RLS | Notas |
|---|---|---|
| `award_types` | false | |
| `awards` | false | |
| `gallery_photos` | false | |
| `goals` | false | **Crítica para Realtime** |
| `match_clock` | false | **Crítica para Realtime** |
| `matches` | false | **Crítica para Realtime** |
| `mvp_official` | false | **Crítica para Realtime** |
| `mvp_votes` | false | **Crítica para Realtime** |
| `organizations` | false | |
| `players` | false | |
| `teams` | false | |
| `tournament_visits` | false | |
| `tournaments` | false | |

### Cómo verificar

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas deben mostrar `false` en la columna `rowsecurity`.

---

## 2. Realtime — Publication

**Estado correcto: las tablas críticas deben estar en la publicación `supabase_realtime`.**

Si una tabla no está en la publicación, los eventos de INSERT/UPDATE/DELETE no llegan a los clientes suscritos aunque el canal esté conectado (status = SUBSCRIBED).

### Tablas en supabase_realtime

| Tabla | En publicación |
|---|---|
| `goals` | ✅ sí |
| `match_clock` | ✅ sí |
| `matches` | ✅ sí |
| `mvp_official` | ✅ sí |
| `mvp_votes` | ✅ sí |

### Cómo verificar

```sql
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Deben aparecer las 5 tablas listadas arriba.

---

## 3. Índices para filtros Realtime

**Los filtros en `postgres_changes` requieren índices en las columnas filtradas.**

Sin estos índices, el filtro `match_id=eq.${match.id}` no funciona y los eventos no se filtran correctamente. La solución actual usa callbacks sin filtro con validación en el cliente, pero los índices son igualmente necesarios para performance.

### Índices requeridos

```sql
CREATE INDEX IF NOT EXISTS idx_goals_match_id ON goals(match_id);
CREATE INDEX IF NOT EXISTS idx_match_clock_match_id ON match_clock(match_id);
CREATE INDEX IF NOT EXISTS idx_mvp_votes_match_id ON mvp_votes(match_id);
CREATE INDEX IF NOT EXISTS idx_mvp_official_match_id ON mvp_official(match_id);
```

### Cómo verificar

```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%match_id'
ORDER BY tablename;
```

---

## 4. Edge Functions

### `create-user`
- **Propósito:** Crear usuarios nuevos desde el panel superadmin
- **Protección:** Valida JWT del request y verifica `app_metadata.role === 'superadmin'`
- **Deploy:** `supabase functions deploy create-user`
- **URL:** `${VITE_SUPABASE_URL}/functions/v1/create-user`

### `verify_scorer_password` (RPC)
- **Propósito:** Verificar contraseña de cargadores sin exponer el campo al cliente
- **Tipo:** Función PostgreSQL con SECURITY DEFINER
- **Nunca expone:** el campo `scorer_password` de la tabla `tournaments`

---

## 5. Roles y app_metadata

### Usuario superadmin
El usuario superadmin debe tener el siguiente campo en `raw_app_meta_data`:

```json
{"role": "superadmin", "provider": "email", "providers": ["email"]}
```

### Cómo verificar

```sql
SELECT email, raw_app_meta_data 
FROM auth.users 
WHERE raw_app_meta_data->>'role' = 'superadmin';
```

---

## 6. Síntomas de configuración incorrecta

| Síntoma | Causa probable | Script de restauración |
|---|---|---|
| Marcador no actualiza en tiempo real | RLS habilitado en `goals` o `matches` | `restore_rls.sql` |
| Campana no suena | RLS habilitado en `goals` (evento INSERT no llega) | `restore_rls.sql` |
| Realtime suscripto pero sin eventos | Tabla no en publication | `restore_realtime.sql` |
| Error 406 en mvp_official | Normal — no hay MVP aún para ese partido | No requiere acción |
| Cargadores no pueden entrar | RPC `verify_scorer_password` caída | Verificar en Database → Functions |
| Superadmin dice "no autorizado" | app_metadata sin rol | `restore_superadmin.sql` |

---

## 7. Procedimiento de restauración rápida

Si algo deja de funcionar, ejecutar en este orden en Supabase SQL Editor:

1. `restore_rls.sql` — deshabilita RLS en todas las tablas
2. `restore_realtime.sql` — agrega tablas a la publicación Realtime
3. `restore_indexes.sql` — crea índices para filtros Realtime
4. Verificar con las queries de verificación de cada sección

Los archivos están en la carpeta `supabase/config/` del repositorio.

---

## 8. Variables de entorno (Vercel)

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública anon |

**Nunca** hardcodear estas variables en el código fuente.

---

*Última actualización: 11 de junio de 2026*
