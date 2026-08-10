# TranslateGemma UI

<div align="center">
  <img src="docs/marketing/linkedin_translategemma_launch_1768756822086.png" alt="TranslateGemma UI Banner" width="100%" />

  <br />

  <!-- Badges -->
  <img src="https://img.shields.io/badge/Status-Beta-blue?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
  <img src="https://img.shields.io/badge/AI-Ollama-orange?style=for-the-badge" alt="Ollama" />
  <img src="https://img.shields.io/badge/Privacy-100%25%20Local-red?style=for-the-badge" alt="Privacy First" />

  <br />
  <br />

  <p align="center">
    <strong>Interfaz moderna y privada para los modelos de traducción de Google DeepMind.</strong>
    <br />
    Sin internet. Sin fugas de datos. 55 idiomas.
    <br />
    <br />
    <a href="#-inicio-rápido">Inicio Rápido</a> •
    <a href="docs/translategemma/README.md">Documentación</a> •
    <a href="https://translate.cedula360.tech">Live Demo</a> •
    <a href="#-galería">Galería Visual</a>
  </p>
</div>

---

## ⚡ ¿Qué es TranslateGemma UI?

**TranslateGemma UI** es la interfaz visual definitiva para interactuar con la nueva familia de modelos **TranslateGemma** (construidos sobre Gemma 3). Diseñada para ofrecer una experiencia similar a las herramientas comerciales en la nube, pero ejecutándose **100% localmente** en tu hardware.

Ideal para:
*   🏢 **Empresas** que manejan documentación sensible.
*   ✈️ **Viajeros** sin conexión a internet.
*   💻 **Desarrolladores** que integran traducción en sus flujos locales.

---

## 🤝 Alianza Cédula 360

TranslateGemma UI es parte del ecosistema bajo
`translate.cedula360.tech` (`translate.alexanderoviedofadul.dev` →
301). Se añadió (aditivo) una **landing pública** en `/`, la
herramienta en `/traducir`, un **panel `/admin` con RBAC** y el login
**"Continuar con Cédula 360"**: Route Handlers Next.js que validan
server-to-server contra la API real de Cédula 360 (`:3081`) + su 2FA,
con sesión vía PocketBase impersonate (usuario `viewer`, sin escalar
roles, sin guardar la contraseña aliada) y reCAPTCHA v3 fail-open.
Detalle en
[`docs/ALIANZA-CEDULA360-2026-05-16.md`](docs/ALIANZA-CEDULA360-2026-05-16.md)
y validación/Pendientes en
[`docs/POLISH-VALIDACION-2026-05-17.md`](docs/POLISH-VALIDACION-2026-05-17.md).

### Pendientes

- **Operador**: añadir `translate.cedula360.tech` a los dominios de la
  llave reCAPTCHA de Cédula 360 en la consola de Google (mitigado por
  el fail-open `score 0.3`).
- **Limitación de infra conocida**: la traducción real depende de
  Ollama local (CPU capada bajo la carga del VPS compartido); la
  alianza/login/UX operan igual.
- **App-admin**: conceder vía PocketBase superuser poniendo
  `users.role = admin`; por defecto los usuarios de alianza son
  `viewer`.
- **Infra compartida**: serializar deploys por webhook / nice-cgroup
  tras el incidente de carga del VPS (contenido; producción saludable).

### Auto-deploy (2026-08-09)

El webhook de despliegue **estuvo apagado sin avisar**: `translate-webhook.service` corría
con el secret de ejemplo (`WEBHOOK_SECRET=tu_secreto_webhook_aqui_cambiar`), así que GitHub
firmaba con el secret real y el servicio respondía **401 `Invalid signature`** — los push a
`main` no desplegaban nada, mientras el servicio figuraba `active` y el sitio 200. Corregido
con un secret real en `/root/.translate_webhook_env` (drop-in `10-secret.conf`) alineado con
el hook de GitHub; verificado con un ping real (**200 OK**, `Signature validated` en el
journal). Detalle y reglas en
[`docs/FIX-WEBHOOK-SECRET-PLACEHOLDER-2026-08-09.md`](docs/FIX-WEBHOOK-SECRET-PLACEHOLDER-2026-08-09.md).

---

## ✨ Características Principales

| Característica | Descripción |
| :--- | :--- |
| 🌍 **55 Idiomas** | Soporte global impulsado por los modelos Gemma 3 de DeepMind. |
| 🔒 **100% Privado** | Tus datos nunca salen de tu dispositivo. Inferencia local con Ollama. |
| 🖼️ **Multimodal** | Arrastra y suelta imágenes para traducir texto dentro de ellas. |
| ⚡ **Rendimiento Flexible** | Elige entre modelos 4B (rápido), 12B (balanceado) o 27B (preciso). |
| 📱 **Diseño Adaptativo** | Experiencia fluida en Desktop, Tablet y Móvil. |

---

## 🎨 Galería

### Dashboard Principal
La potencia de la traducción profesional en un diseño minimalista.
![Desktop Dashboard](docs/stitch_translategemma_ui/translategemma_main_dashboard/screen.png)

### Experiencia Móvil
Lleva 55 idiomas en tu bolsillo.
<div align="center">
  <img src="docs/stitch_translategemma_ui/mobile_translation_view/screen.png" width="30%" alt="Mobile View" />
  <img src="docs/stitch_translategemma_ui/mobile_fullscreen_language_selector/screen.png" width="30%" alt="Language Selector" />
  <img src="docs/stitch_translategemma_ui/mobile_hamburger_menu_expanded/screen.png" width="30%" alt="Menu Dark Mode" />
</div>

### Configuración de Modelos
Gestiona tus modelos LLM locales fácilmente.
![Settings](docs/stitch_translategemma_ui/settings_and_preferences/screen.png)

---

## 🚀 Inicio Rápido

### Prerrequisitos

1.  Tener **[Ollama](https://ollama.com/)** instalado (o Docker).
2.  Tener al menos 8GB de RAM (para el modelo 4B/12B).
3.  Node.js >= 20 (para desarrollo).

### Instalación con Docker (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/bladealex9848/TranslateGemma-UI.git
cd TranslateGemma-UI

# 2. Iniciar todos los servicios (Frontend + Ollama + PocketBase)
docker compose up -d

# 3. Descargar el modelo de traducción (Esperar a que Ollama inicie)
docker exec -it translategemma-ui-ollama-1 ollama pull translategemma:latest

# 4. Acceder a la aplicación
open http://localhost:3000
```

### Desarrollo Local

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/bladealex9848/TranslateGemma-UI.git
cd TranslateGemma-UI/frontend
npm install

# 2. Configurar entorno
cp .env.local.example .env.local
# Editar .env.local con tus URLs de Ollama y PocketBase

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir http://localhost:3000
```

---

## 📚 Documentación Técnica

Todo lo que necesitas saber sobre los modelos y la integración:

*   📖 **[Guía de Modelos](./docs/translategemma/MODELS.md)**: Comparativa de rendimiento 4B vs 12B vs 27B.
*   🗣️ **[Lista de Idiomas](./docs/translategemma/LANGUAGES.md)**: Todos los códigos ISO soportados.
*   🤖 **[Guía de Prompts](./docs/translategemma/PROMPT_GUIDE.md)**: Cómo hablar con el modelo vía API.
*   📱 **[Análisis de Diseño UI](./docs/UI_DESIGN_COMPLIANCE_ANALYSIS.md)**: Desglose completo de la interfaz.
*   🗺️ **[Roadmap de Implementación](./docs/IMPLEMENTATION_ROADMAP.md)**: Estado actual del desarrollo.
*   🚀 **[Webhook & Deployment](./docs/WEBHOOK-DEPLOYMENT.md)**: Pipeline de despliegue automático (build limpio + restart).
*   🩺 **[Troubleshooting](./docs/TROUBLESHOOTING.md)**: Problemas comunes y soluciones (incl. `ChunkLoadError` / CSS 500).

---

## 🛠️ Arquitectura

El proyecto utiliza una arquitectura moderna y desacoplada:

| Capa | Tecnología | Versión |
| :--- | :--- | :--- |
| **Frontend** | Next.js + React + TypeScript | 16.x / 19.x |
| **Styling** | Tailwind CSS | 4.x |
| **State** | Zustand | 5.x |
| **Backend/Auth** | PocketBase | 0.24+ |
| **LLM Runtime** | Ollama | Latest |
| **Modelos** | TranslateGemma (Google DeepMind) | 4B/12B/27B |

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Especialmente en:
*   Traducción de la interfaz.
*   Optimización de prompts para casos de borde.
*   Adaptadores para nuevos modelos.

---

<div align="center">
  <sub>Desarrollado con ❤️ para la comunidad Open Source.</sub>
</div>
