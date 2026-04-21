# DHIMM - Descripcion General del Sitio

## 1) Que es este sitio web
DHIMM es una tienda en linea de refacciones automotrices. El proyecto permite:
- Mostrar un catalogo de productos por categoria.
- Agregar productos al carrito.
- Cotizar envio en tiempo real (Skydropx) o elegir recoleccion en tienda.
- Cobrar con Mercado Pago.
- Registrar pedidos y actualizar inventario.
- Administrar productos y pedidos desde un panel de admin.
- Medir visitas y ventas con un dashboard basico de analitica.

## 2) Arquitectura general
- Frontend: React + Vite + TypeScript + Tailwind.
- Backend: Node.js + Express.
- Base de datos: Supabase (PostgreSQL + Storage).
- Pagos: Mercado Pago (preferencias, checkout y webhook).
- Envio: Skydropx (cotizacion de guias/tarifas).

### Flujo de alto nivel
1. El frontend consume API del backend para productos, pedidos, perfiles y analitica.
2. El frontend crea la preferencia de Mercado Pago y abre checkout.
3. El backend recibe webhook de Mercado Pago y confirma estado de pago.
4. El backend crea/actualiza pedido en Supabase y descuenta stock cuando aplica.

## 3) Funcionalidades principales del sitio

### Cliente final
- Inicio y catalogo de productos.
- Vista de detalle por producto.
- Carrito con control de cantidades y validacion de stock.
- Checkout en pasos:
  - Datos de entrega y contacto.
  - Cotizacion de envio con Skydropx o pickup.
  - Pago con Mercado Pago.
- Pantalla de espera de pago:
  - Hace polling al backend para detectar cuando el pedido ya existe o cambia de estado.
- Pantalla de exito/fallo.
- Dashboard de usuario:
  - Ver historial de pedidos.
  - Gestionar direcciones guardadas.
- Login, registro, recuperacion y reset de password (Supabase Auth).

### Administrador
- Panel admin protegido por rol.
- CRUD de productos:
  - Crear, editar, eliminar.
  - Subir imagen de producto a Supabase Storage.
- Gestion de pedidos:
  - Ver todos los pedidos.
  - Cambiar estado del pedido.
- Visualizacion de metricas:
  - Visitantes unicos por periodo.
  - Serie de visitas, pedidos y revenue.

## 4) Rutas funcionales importantes (frontend)
- Publicas: Home, Catalog, About, ProductDetail, Cart, Checkout.
- Autenticacion: Login, Register, ForgotPassword, ResetPassword.
- Post-pago: CheckoutWaiting, CheckoutSuccess, CheckoutFailure.
- Privadas:
  - Dashboard de usuario (requiere sesion).
  - AdminPanel (requiere rol admin).

Nota: El frontend usa HashRouter, por eso las rutas se ven con # en URL.

## 5) API del backend (resumen)

### Salud y utilidades
- GET /api/health

### Envio
- POST /api/shipping/quote
  - Recibe destino y regresa mejor tarifa disponible desde Skydropx.

### Analitica
- POST /api/analytics/visit
  - Registra visita unica por visitor_id y dia.
- GET /api/analytics/visits
  - Resumen de visitantes unicos semanal/mensual/total.
- GET /api/analytics/series
  - Serie temporal de visitantes, pedidos y revenue.

### Mercado Pago
- GET /api/mp/payment-methods
- GET /api/mp/preferences/:preferenceId
- POST /api/mp/webhook
  - Endpoint critico: valida firma, consulta pago en MP, valida monto, evita duplicados, crea/actualiza pedido, reduce stock.

### Pedidos
- POST /api/pending-orders/:orderId
  - Guarda temporalmente (en memoria) datos del pedido para usarlos al llegar webhook.
- GET /api/orders/:orderId
- GET /api/user-orders/:userId
- GET /api/all-orders
- PUT /api/orders/:id

### Productos
- GET /api/products
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id
- POST /api/uploads/product-image

### Perfil de usuario
- GET /api/user-profile/:userId
- POST /api/user-profile
- PUT /api/user-addresses/:userId

## 6) Como funciona la base de datos

La DB principal vive en Supabase (PostgreSQL) y se complementa con Supabase Storage para imagenes.

### Tablas clave
- products
  - Catalogo de productos: nombre, categoria, marca, modelos compatibles, precio, stock, imagen, descripcion.
- orders
  - Pedidos: cliente, items (JSON), total, direccion, estado y campos de pago (payment_id, payment_status, merchant_order_id, currency, transaction_amount, paid_at).
- profiles
  - Perfil por usuario: nombre, email, role (user/admin), addresses.
- page_visits
  - Analitica de trafico: visitor_id, path, visit_date, created_at.

### Tablas opcionales recomendadas en docs de migracion
- payment_history
  - Historial de cambios de estado de pago.
- payment_events
  - Log de eventos de webhook/pago para auditoria.

### Storage
- Bucket product-images
  - Guarda imagenes subidas desde admin.
  - El backend genera URL publica para guardar en products.image.

## 7) Flujo de datos de checkout y pagos

### 7.1 Antes del pago
1. Usuario completa checkout.
2. Se calcula envio (si aplica) con /api/shipping/quote.
3. Frontend genera orderId y guarda pedido temporal en sessionStorage.
4. Frontend envia pedido temporal a /api/pending-orders/:orderId.
5. Frontend crea preferencia de Mercado Pago y abre popup de checkout.

### 7.2 Confirmacion por webhook
1. Mercado Pago llama /api/mp/webhook.
2. Backend valida firma (en produccion) y obtiene paymentId.
3. Backend consulta API de Mercado Pago para obtener datos completos del pago.
4. Backend valida:
  - external_reference (orderId valido UUID).
  - moneda MXN.
  - monto pagado contra monto esperado.
  - idempotencia por payment_id y order_id.
5. Si pago es valido:
  - Crea o actualiza order en DB.
  - Cambia estado segun mapping de estado de MP.
  - Reduce inventario cuando el pago queda en estado pagado.

### 7.3 Confirmacion en frontend
- CheckoutWaiting consulta periodicamente /api/orders/:orderId.
- Cuando detecta estado aprobado/pagado, redirige a pantalla de exito.

## 8) Roles, seguridad y RLS
- El frontend usa anon key de Supabase.
- El backend puede usar service role key (MP_WEBHOOK_SERVICE_ROLE_KEY) para operaciones privilegiadas.
- Operaciones sensibles (admin, webhook, upload, updates de pedido/producto) dependen del service role.
- El webhook tiene validacion de firma para ambiente productivo.
- La migracion recomienda politicas RLS para que usuario vea solo sus pedidos y admin vea todos.

## 9) Variables de entorno importantes

### Frontend (VITE_*)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_MP_PUBLIC_KEY
- VITE_MP_ACCESS_TOKEN
- VITE_BACKEND_URL

### Backend
- SUPABASE_URL
- SUPABASE_ANON_KEY
- MP_WEBHOOK_SERVICE_ROLE_KEY
- MP_WEBHOOK_SECRET
- MP_ACCESS_TOKEN
- GUEST_EMAIL
- SKYDROPX_* (credenciales/config de cotizacion de envio)

## 10) Observaciones tecnicas actuales
- El camino principal de produccion para crear pedidos es via webhook, no directamente desde frontend.
- Existe logica historica en frontend para insercion/actualizacion directa con Supabase que puede convivir con flujo nuevo; conviene mantener una sola fuente de verdad (webhook + backend).
- La categoria de productos se normaliza para compatibilidad con datos legacy.

## 11) Resumen rapido
Este sitio es un ecommerce automotriz completo con:
- Catalogo + carrito + checkout.
- Envio cotizado en tiempo real.
- Cobro con Mercado Pago.
- Confirmacion de pedidos por webhook seguro.
- Inventario sincronizado.
- Admin panel para operacion diaria.
- Analitica basica para seguimiento de trafico y ventas.
