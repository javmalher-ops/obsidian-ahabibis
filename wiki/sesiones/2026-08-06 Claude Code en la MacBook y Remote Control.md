---
tipo: sesion
creado: 2026-08-06
actualizado: 2026-08-06
---

# Sesión — 6 de agosto de 2026: Claude Code en la MacBook y Remote Control

Sesión técnica, no de wiki: no se ingirió ninguna fuente ni se modificó
ninguna página de contenido. El objetivo fue poder usar Claude desde el
celular y la laptop a la vez. Se documenta aquí porque quedó a medias y
hay que retomarla.

## 1. Punto de partida

Dos preguntas distintas que se mezclaron durante la sesión:

1. **Sincronización de conversaciones** — en la app de Claude del celular
   no aparecen todas las conversaciones que sí se ven en la laptop.
2. **Control multi-dispositivo** — poder ver y escribir en Claude desde
   ambos aparatos.

La segunda se resolvió (casi); la primera **sigue sin diagnosticar**.

## 2. El camino equivocado

Se exploró [Scrcpy](https://github.com/Genymobile/scrcpy) (proyectar la
pantalla de un Android en la laptop) antes de descubrir que existe una
función nativa: **Claude Code Remote Control**. La app del celular la
ofrece en la pestaña *Código → Dispositivos*, con la instrucción de correr
`claude remote-control` (o `claude rc`) en la computadora.

Scrcpy quedó descartado — resuelve otro problema.

## 3. Instalación de Claude Code en la MacBook

Estado inicial de la Mac (`MacBook-Air-de-Javier`, Apple Silicon, zsh):
sin `claude`, sin `brew`.

Se intentaron tres rutas; solo la tercera sirvió:

| Ruta | Comando | Resultado |
|---|---|---|
| npm | `npm install -g @anthropic-ai/claude` | ❌ 404 — el paquete no existe (el correcto es `@anthropic-ai/claude-code`) |
| Homebrew | `brew install claude` | ❌ tampoco existe (el correcto es `brew install --cask claude-code`) |
| Instalador nativo | `curl -fsSL https://claude.ai/install.sh \| bash` | ✅ funcionó |

**Instalación final:**

- Ubicación: `~/.local/bin/claude`
- Versión: `2.1.222 (Claude Code)`
- Verificado con `claude --version` tras reabrir la Terminal

## 4. Pendiente para retomar

```bash
claude            # arranca la sesión interactiva
/login            # abre el navegador; entrar con javmalher@gmail.com
/exit
claude remote-control
```

Después, en el celular: app → **Dispositivos** → seleccionar la MacBook.

`claude remote-control` falló con:

> `Error: You must be logged in to use Remote Control.`
> `Remote Control is only available with claude.ai subscriptions.`

Es decir: **requiere suscripción de claude.ai** (Pro, Max, Team o
Enterprise) además del login. Si tras iniciar sesión vuelve a fallar, el
problema es el plan, no la instalación.

## 5. Cabos sueltos

- **Homebrew quedó a medias.** La descarga de `portable-ruby` se colgó en
  24.2% y se canceló con `Ctrl+C`. El directorio `/opt/homebrew` existe y
  `/etc/paths.d/homebrew` ya está creado, pero `brew` probablemente no
  funciona. **No hace falta para nada** — si algún día se quiere, hay que
  reinstalarlo con red estable.
- **Red intermitente.** Durante la instalación salieron varios
  `fatal: unable to access 'https://github.com/Homebrew/brew/': Could not
  resolve host: github.com`. Es fallo de DNS/WiFi, no de los comandos.
- **La Terminal debe quedarse abierta** mientras corre `remote-control`;
  si se cierra, se corta la conexión con el celular.
- **Problema original sin resolver:** las conversaciones que no aparecen
  en la app del celular. No se llegó a diagnosticar (no se confirmó
  cuántas conversaciones se ven en cada lado, ni si la cuenta del celular
  es efectivamente `javmalher@gmail.com`).

## 6. Nota sobre esta página

Vive en `wiki/sesiones/` por continuidad con
[[2026-07-21 Configuracion Inicial y Primera Ingesta]], pero no aporta
conocimiento al tema de la wiki — es memoria operativa para no repetir
los pasos ni los errores. Ver [[../log|log.md]] para el registro
cronológico.
