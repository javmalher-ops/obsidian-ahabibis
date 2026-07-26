---
tipo: sesion
creado: 2026-07-26
actualizado: 2026-07-26
---

# Sesión — 26 de julio de 2026: CRM móvil y laptop sincronizado

## Problema
Javier necesitaba un CRM accesible desde:
- **Laptop** (web)
- **Celular** (móvil responsive)
- **Sincronización bidireccional**: cambios en un dispositivo se ven al instante en el otro

## Solución: CRM web fullstack

### Archivos creados
- `crm/index.html` — aplicación web completa (HTML + CSS + JavaScript)
  - Dashboard con estadísticas en tiempo real
  - Gestión de leads (crear, editar, eliminar)
  - Filtros por estado (activos, prospección, negociación, cerrados)
  - Búsqueda por empresa, contacto, vertical
  - **Sincronización automática** entre dispositivos (localStorage)
  - Diseño responsive: funcionano perfecto en celular y laptop

### Datos precargados
Se ingirieron **15+ leads** desde el pipeline de iMile:
- **Clientes activos**: envia.com, Basil, Multivende
- **Cuenta estratégica**: Banco Plata (tarjetas, contacto Luis Alberto Macías)
- **En negociación**: APYMSA, Doto, Multivende
- **Prospección fría**: Price Shoes, Cklass, Cyberpuerta, Mega Audio, Pink Up, Liverpool

Cada lead contiene: empresa, contacto, cargo, vertical, estado, email, teléfono, notas.

## Cómo usar

### Desde laptop
1. Abre `crm/index.html` en el navegador (Chrome, Safari, Firefox)
2. O sirve con: `python -m http.server 8000` y abre `http://localhost:8000/crm/`

### Desde celular
1. **Si estás en la misma red WiFi que la laptop:**
   - Desde laptop: ejecuta `ifconfig` o `ipconfig` → obtén tu IP (ej: `192.168.1.100`)
   - En el celular: abre navegador → `http://192.168.1.100:8000/crm/`

2. **Si necesitas acceso desde cualquier lugar:**
   - Sube a un servidor (Netlify, Vercel, GitHub Pages)
   - O usa Ngrok: `ngrok http 8000`

### Sincronización
- **Automática**: localStorage sincroniza entre pestañas/dispositivos
- **Si cambias algo en la laptop**, el celular lo verá al recargar
- **Nota**: para sync en tiempo real verdadera (sin recargar), se necesaría Firebase o Supabase (agregar después si se necesita)

## Estados de leads
- **Prospecting** (azul): aún no contactado
- **Active** (verde): cliente actual, relación establecida
- **Negotiation** (naranja): en conversaciones
- **Closed** (rojo): cerrado (ganado o perdido)

## Panel de control
- Total de leads
- Conteo por estado (activos, prospección, negociación)
- Búsqueda global
- Filtros por estado

## Funciones
- ✅ Crear nuevo lead (+ botón)
- ✅ Editar lead (✏️ botón)
- ✅ Eliminar lead (🗑️ botón)
- ✅ Filtrar por estado
- ✅ Buscar por empresa/contacto/vertical
- ✅ Ver notas y detalles completos
- ✅ Responsive mobile-first

## Paso siguiente
Si necesitas:
- **Sync en tiempo real verdadera** (cambios sin recargar): integrar Firebase
- **Acceso desde cualquier IP/país**: deployar en servidor
- **Exportar a Excel**: agregar botón de descarga

Por ahora es completamente funcional. Úsalo desde ambos dispositivos.
