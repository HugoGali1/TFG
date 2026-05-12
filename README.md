# 🔥 Brasa & Ascuas

> **Aplicación de pedidos en mesa para restaurante de buffet libre** con check-in mediante QR, sincronización en tiempo real con cocina, tarifa por buffet con varios niveles, simulación de pagos y panel de administración con métricas en directo.

Trabajo de Fin de Grado (TFG) que presenta una arquitectura próxima a producción: aplicación cliente/staff con **Ionic + Angular**, API en **NestJS + MongoDB**, **Socket.io** para actualizaciones en tiempo real y una clara separación de responsabilidades entre los roles cliente, cocina y administrador.

---

## 📋 Tabla de contenidos

- [Características](#-características)
- [Stack tecnológico](#%EF%B8%8F-stack-tecnológico)
- [Arquitectura](#%EF%B8%8F-arquitectura)
- [Puesta en marcha](#-puesta-en-marcha)
- [Cuentas demo y panel de pruebas](#-cuentas-demo-y-panel-de-pruebas)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Decisiones de diseño](#-decisiones-de-diseño)
- [Flujo de eventos en tiempo real](#-flujo-de-eventos-en-tiempo-real)
- [Lógica de cobro del buffet](#-lógica-de-cobro-del-buffet)
- [Internacionalización (ES / EN)](#-internacionalización-es--en)
- [Tests](#-tests)
- [Documentación de la API](#-documentación-de-la-api)
- [Trabajo futuro](#-trabajo-futuro)

---

## ✨ Características

### Cliente
- **QR estático por mesa** — escaneas una vez → se crea sesión nueva (o se rejunta a la existente si la mesa está ocupada)
- **Selección de buffet** al inicio de la sesión: tres tarifas (Brasa, Mar, Completo) con precios distintos
- **Carta inteligente** que distingue platos *Incluidos* en el buffet de los extras
- **Seguimiento del pedido en directo** — recibe un toast en cuanto un plato pasa a *Listo* en cocina
- **Interfaz bilingüe** (español / inglés) con preferencia persistente y traducción de campos en tiempo de ejecución (`name` ↔ `nameEn`)
- **Punto de cocción** (poco / medio / al punto / hecho) solo para platos a la brasa
- **Las bebidas saltan estados intermedios** (recibido → servido directo), modelado en el flujo de cocina
- **Propina + simulación de pago** con UX por método (Tarjeta / Apple Pay / Bizum)
- **Valoración tras pagar** con comentario opcional, persistida en la colección de feedback

### Cocina
- **Aviso en tiempo real al entrar un pedido** con campana audible, animación de pulso y cambio del título de pestaña (visible en segundo plano)
- **Transiciones de estado por plato** con copy adaptado al producto: *"Poner en brasa"* para grilled, *"Servir"* para bebidas, *"Empezar"* genérico
- **Re-incorporación automática a la sala WS tras reconectar** — sin recargas manuales después de cortes de red
- **Panel de solicitudes del camarero** (asistencia / cuenta / para llevar)

### Administración
- **CRUD de mesas, platos y buffets** con edición inline de precios
- **Activar / desactivar disponibilidad** de un plato al instante (la cocina lo refleja en directo)
- **Dashboard de métricas en tiempo real**: pedidos del día, ingresos del día, mesas activas, valoración media, top de platos, buffets más vendidos, últimas valoraciones
- **Auto-recuperación del token admin** cuando otra pestaña sobrescribe `localStorage` con un rol distinto

### Aspectos de ingeniería
- **Interceptor HTTP global** que convierte cualquier error en toast con mensaje específico por código de estado
- **Guards basados en rol** (`authGuard`, `adminGuard`, `buffetGuard`)
- **Salas de WebSocket por sesión** con re-emisión automática del `join` al reconectar
- **Validación de DTOs con whitelist** en cada endpoint vía `class-validator` + `ValidationPipe`
- **Agregaciones de MongoDB** para el dashboard de métricas
- **Tests unitarios** que cubren las reglas de pricing del buffet

---

## 🛠️ Stack tecnológico

| Capa         | Tecnología                            | Justificación |
|--------------|---------------------------------------|---------------|
| Frontend     | **Ionic 8 + Angular 20**              | UI con sensación nativa, módulos lazy-loaded, ejecutable en iOS/Android vía Capacitor |
| Backend      | **NestJS 11**                         | Modular, opinionado, TypeScript de primera clase, baterías incluidas (DI, guards, validación, OpenAPI) |
| BBDD         | **MongoDB** vía Mongoose              | Esquemas flexibles (encajan bien con menú y buffets), agregaciones para estadísticas |
| Tiempo real  | **Socket.io**                         | Pub/sub cliente ↔ cocina mediante salas, consciente de reconexiones |
| Auth         | **JWT + Passport**                    | Stateless, control de acceso por rol |
| Pagos        | **Stripe SDK** (mantenido) + **simulado** | Vía Stripe está cableada pero un endpoint `simulate` evita la dependencia externa para la demo |
| Tests        | **Jest**                              | Unit + integración, opción por defecto en NestJS |
| Docs API     | **Swagger** en `/api/docs`            | Generadas automáticamente desde decoradores |

---

## 🏗️ Arquitectura

```
┌────────────────────┐         ┌────────────────────┐         ┌────────────────────┐
│  CLIENTE (Ionic)   │         │  COCINA (Ionic)    │         │  ADMIN (Ionic)     │
│  Escanea QR, pide  │         │  Auth: cocina      │         │  Auth: admin       │
└─────────┬──────────┘         └─────────┬──────────┘         └─────────┬──────────┘
          │                              │                              │
          │ HTTP (REST)                  │ HTTP                         │ HTTP
          │ WS (sala session)            │ WS (sala kitchen)            │
          │                              │                              │
          ▼                              ▼                              ▼
   ┌──────────────────────────────────────────────────────────────────────┐
   │                    API NestJS (HTTP + WebSocket)                     │
   │  ┌────────┬────────┬─────────┬─────────┬─────────┬───────┬────────┐  │
   │  │ Auth   │ Users  │ Tables  │ Menu    │ Buffet  │ Sessi │Orders  │  │
   │  └────────┴────────┴─────────┴─────────┴─────────┴───────┴────────┘  │
   │  ┌────────┬────────┬─────────┬─────────┐                             │
   │  │ Payment│ Feedb. │ Waiter  │ Stats   │   ┌──────────────────┐      │
   │  └────────┴────────┴─────────┴─────────┘   │ EventsGateway    │      │
   │                                            │ (Socket.io)      │      │
   │                                            └──────────────────┘      │
   └─────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
                              ┌────────────┐
                              │  MongoDB   │
                              └────────────┘
```

Cuando un cliente envía un pedido nuevo se desencadenan:
1. `OrdersService.create` → cobra según el buffet activo y persiste el pedido
2. `EventsGateway.emitNewOrder` → broadcast a la sala `kitchen` (con sonido y aviso visual)
3. La cocina marca un plato como listo → broadcast a la sala `session:<id>` del cliente → toast en el dispositivo del cliente

---

## 🚀 Puesta en marcha

### Requisitos previos
- Node.js 20 o superior
- MongoDB local en `mongodb://localhost:27017` (o ajustar `MONGODB_URI` en `.env`)

### Backend
```bash
cd brasa-ascuas-backend
cp .env.example .env             # ajustar JWT_SECRET, MONGODB_URI, etc.
npm install
npm run seed                      # crea usuarios admin/cocina/camarero, mesas, carta y buffets
npm run start:dev                 # http://localhost:3000  •  Swagger en /api/docs
```

### Frontend
```bash
cd brasa-ascuas-app
npm install
npm start                         # http://localhost:4200
```

### Tests
```bash
cd brasa-ascuas-backend
npm test                          # 9 tests unitarios sobre pricing y lógica de buffets
```

---

## 🔧 Cuentas demo y panel de pruebas

Tres cuentas creadas por el seed para el lado del staff:

| Rol      | Email                          | Contraseña    |
|----------|--------------------------------|---------------|
| Admin    | `admin@brasaascuas.es`         | `admin1234`   |
| Cocina   | `cocina@brasaascuas.es`        | `cocina1234`  |
| Camarero | `marta@brasaascuas.es`         | `marta1234`   |

Para probar el flujo de cliente sin imprimir QRs físicos, la app expone un **panel de pruebas en `/dev`** con accesos rápidos:

- **Panel admin** — login automático como administrador
- **Panel cocina** — login automático como cocina, abre nueva pestaña
- **Cualquier mesa** — cierra la sesión activa, libera la mesa y abre el flujo del cliente en pestaña nueva

Cada acceso abre en una pestaña nueva, por lo que se pueden probar los tres roles a la vez.

---

## 📂 Estructura del proyecto

```
TFG/
├── brasa-ascuas-app/          # Cliente Ionic + Angular
│   └── src/app/
│       ├── pages/             # welcome, table-scan, choose-buffet, menu, dish-detail,
│       │                      # cart, order-confirmation, order-status, order-history,
│       │                      # call-waiter, payment, payment-success, kitchen, admin, dev
│       ├── services/          # api, auth, session, cart, order, menu, buffet, payment, socket, lang
│       ├── guards/            # auth, admin, buffet
│       ├── interceptors/      # http-error
│       ├── pipes/             # translate, translate-field
│       ├── shared/            # SharedModule (pipes de i18n)
│       └── utils/             # status-label, image-focal
│
└── brasa-ascuas-backend/      # API NestJS
    └── src/
        ├── auth/              # JWT, guards, decorators, roles
        ├── users/
        ├── tables/            # CRUD + códigos QR
        ├── menu/              # categorías + platos
        ├── buffet/            # tarifas y categorías incluidas
        ├── sessions/          # sesiones de mesa, elección de buffet, autoapertura por QR
        ├── orders/            # rondas, estados de items, pricing consciente del buffet
        ├── payments/          # Stripe + endpoint simulate
        ├── feedback/          # valoraciones tras pagar
        ├── waiter-requests/   # llamada al camarero
        ├── stats/             # agregaciones para el dashboard admin
        ├── gateway/           # salas Socket.io
        └── seed.ts            # seed idempotente (usuarios, mesas, menú, buffets)
```

---

## 🎯 Decisiones de diseño

### QR estático por mesa (frente a dinámico)
Cada mesa tiene **un único QR inmutable** impreso una sola vez. Al escanearlo:
- Si la mesa tiene una sesión activa → el cliente se une a ella (cubre el caso de comensales que llegan en distintos momentos)
- Si está libre → el cliente elige cuántos son y se abre una sesión nueva

**Trade-off**: más simple para el restaurante (sin reimprimir QRs cada servicio) a cambio de permitir abrir sesión a cualquiera con la URL del QR — mitigado por el acceso físico a la mesa. La opción de QRs dinámicos por sesión queda apuntada como mejora futura.

### Cobro del buffet en el backend (no en el frontend)
`OrdersService` decide para cada línea si es `linePrice = 0` (cubierta por el buffet) o `linePrice = unitPrice × cantidad` (extra). El frontend solo muestra lo que el backend ya calculó. La fuente de verdad permanece en el servidor y se evita cualquier manipulación desde el cliente.

### Aislamiento de roles entre pestañas
Almacenar el JWT en `localStorage` (compartido entre pestañas) entra en conflicto con el caso de uso de **abrir admin en una pestaña y cocina en otra**. En lugar de refactorizar el modelo de auth, el panel admin **se reautentica silenciosamente como admin** en el evento `visibilitychange` y antes de cada acción de escritura, garantizando que se usa el token correcto. Está documentado como compromiso conocido; el refactor a `sessionStorage` está en el roadmap.

### Stripe cableado, simulador por defecto
La integración con Stripe (`PaymentIntent`, manejo de webhook) está completa pero **deliberadamente no es el flujo por defecto**. Un endpoint `POST /payments/simulate` cortocircuita la pasarela, marca el pago como `succeeded`, libera la mesa y emite el evento `payment-confirmed`. Pasar a Stripe real en producción solo requiere cambiar a qué endpoint llama el frontend.

### Campana real con fallback a la política de autoplay
La cocina reproduce un `.mp3` real al entrar un pedido. Si el navegador bloquea el autoplay (porque el usuario aún no ha interactuado), el flash visual y el aviso en el título de la pestaña siguen funcionando — degradación elegante.

---

## ⚡ Flujo de eventos en tiempo real

La app usa Socket.io con **salas con nombre** en lugar de hacer broadcast a todo el mundo:

| Evento               | Emisor (servidor)                   | Salas suscritas        | Listeners (cliente)                          |
|----------------------|-------------------------------------|------------------------|----------------------------------------------|
| `new-order`          | `OrdersService.create`              | `kitchen` + `waiters`  | Panel cocina: campana + flash                |
| `order-received`     | `OrdersService.create`              | `session:<sessionId>`  | Cliente: confirma pedido enviado             |
| `order-updated`      | `OrdersService.updateItemStatus`    | `session:<sid>` + `kit`| Cliente: toast al pasar a `ready`            |
| `payment-confirmed`  | `PaymentsService.simulate/success`  | `session:<sid>`        | Cliente: redirige a `/payment-success`       |
| `waiter-request`     | `WaiterRequestsService.create`      | `waiters`              | Panel cocina: actualiza badge                |

Un `SocketService` propio en el cliente recuerda **qué salas se han unido** y reemite `join-session` / `join-kitchen` en cada reconexión. Así el cliente no se pierde notificaciones después de que el navegador throttle la pestaña, el dispositivo se duerma o haya un parpadeo de red — escenarios típicos en un restaurante.

---

## 💰 Lógica de cobro del buffet

Los buffets se definen en BBDD con `pricePerPerson` y una lista de `includedCategories`. Al elegir uno:

```ts
session.totalAmount = buffet.pricePerPerson × session.partySize;
```

Cuando el cliente pide, cada línea se cobra como:

```ts
const isCovered = buffet.includedCategories.includes(item.category);
line.linePrice = isCovered ? 0 : item.price * quantity;
order.totalAmount = sum(line.linePrice);          // sólo extras
session.totalAmount += order.totalAmount;          // crece con extras
```

Cuenta final = `session.totalAmount + propina`.

Esta separación significa que un cliente con Buffet Brasa puede pedir un extra del mar y ver con exactitud lo que paga aparte; mientras tanto, todos los items "incluidos" se siguen registrando (cocina sabe qué cocinar) pero con coste cero.

Tres tarifas por defecto (configurables desde el panel admin):

| Buffet         | €/persona     | Categorías incluidas                                     |
|----------------|---------------|----------------------------------------------------------|
| Buffet Brasa   | **49 €**      | A la brasa · Entrantes · Postres · Bebidas               |
| Buffet del Mar | **45 €**      | Del Mar · Entrantes · Postres · Bebidas                  |
| Buffet Completo| **65 €**      | A la brasa · Del Mar · Entrantes · Postres · Bebidas     |

---

## 🌍 Internacionalización (ES / EN)

La aplicación usa un enfoque híbrido:

- **Etiquetas de UI** (botones, cabeceras, placeholders) → diccionario estático en `LangService`, accedido vía pipe `| t`
- **Contenido de BBDD** (nombres de platos, descripciones, buffets, categorías) → campos bilingües (`name` / `nameEn`, etc.) accedidos vía pipe `| tField:'name'` que escoge el idioma activo

Ambos pipes son reactivos — al cambiar de idioma se vuelve a renderizar todo el contenido visible sin navegación. La preferencia se persiste en `localStorage`. El toggle es un botón circular que muestra **la bandera del idioma al que cambiarías** (acción, no estado).

---

## 🧪 Tests

La lógica crítica de negocio queda cubierta con tests unitarios en Jest:

```
PASS  src/sessions/sessions.service.spec.ts
PASS  src/orders/orders.service.spec.ts

Test Suites: 2 passed, 2 total
Tests:       9 passed, 9 total
Time:        2,4 s
```

**Por qué estos tests en concreto**

El cobro del buffet y la asociación sesión-buffet son los puntos donde un refactor futuro tiene más probabilidades de romper en silencio el cálculo de la cuenta — un bug que *cuesta dinero al restaurante*. El resto del sistema (UI, sockets, persistencia) tiende a manifestar fallos visiblemente. Los tests están enfocados en los **caminos que afectan al ingreso**, no a buscar cobertura plana de cada línea.

Caso de ejemplo de `orders.service.spec.ts`:

```ts
it('totalAmount es la suma SOLO de los extras (los cubiertos no suman)', async () => {
  const buffet = { includedCategories: [{ _id: 'cat_brasa' }] };
  sessionsService.findById.mockResolvedValue(mockSession(buffet));
  menuService.findItemById
    .mockResolvedValueOnce(chuleton)   // cubierto
    .mockResolvedValueOnce(pulpo);     // no cubierto

  await service.create({ /* uno de cada */ });

  expect(capturedOrderData.items[0].linePrice).toBe(0);     // chuletón cubierto
  expect(capturedOrderData.items[1].linePrice).toBe(24);    // pulpo extra
  expect(capturedOrderData.totalAmount).toBe(24);            // sólo extras
});
```

Se ejecutan con `npm test` desde el directorio backend.

---

## 📖 Documentación de la API

NestJS genera automáticamente la documentación OpenAPI 3 a partir de los decoradores de los controladores.

Con el backend en marcha:
**[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

Los endpoints están agrupados por etiqueta (`auth`, `tables`, `menu`, `buffets`, `sessions`, `orders`, `payments`, `feedback`, `waiter-requests`, `stats`) e incluyen los esquemas de request/response, los roles requeridos y ejemplos de payload.

---

## 🔮 Trabajo futuro

Funcionalidades planteadas como siguientes pasos naturales:

- [ ] **Tests E2E** con `mongodb-memory-server` cubriendo el flujo completo: QR → buffet → pedido → pago → liberación de mesa
- [ ] **Rate limiting** en `/sessions/from-qr` y `/auth/login` con `@nestjs/throttler`
- [ ] **Guard de propiedad de sesión** que valide el `sessionId` del cliente contra una cabecera opaca
- [ ] **Cuenta dividida** (`Pagar 1/N`) en la pantalla de pago
- [ ] **Notificaciones push** en móvil real vía Capacitor
- [ ] **Soporte multi-restaurante** (mesas, carta y buffets con scope por tenant)
- [ ] **Refactor** del auth de staff a `sessionStorage` para aislamiento real entre pestañas
- [ ] **Generación de PNGs físicos del QR** desde el panel admin con la librería `qrcode`

---

## 📝 Licencia

Proyecto de Trabajo Fin de Grado. Código compartido con fines educativos y de portafolio.

---

## 👤 Autor

**Hugo Galiana Real** — Desarrollador full-stack, Valencia (España).

Trabajo Fin de Grado del **Grado Superior en Desarrollo de Aplicaciones Multiplataforma (DAM)** en el Centro de FP Progresa. Foco puesto en arquitectura próxima a producción, UX en tiempo real y separación limpia de responsabilidades por rol.

- 🌐 [Portfolio](https://hugogaliana-dev.vercel.app)
- 💼 [LinkedIn](https://www.linkedin.com/in/hugo-galiana-real-8a1831329/)
- ✉️ [hgalianareal@gmail.com](mailto:hgalianareal@gmail.com)
