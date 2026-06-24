# Sistema JUEM - Reglas de Sincronización y Variantes

Para evitar malentendidos en futuras actualizaciones, se deben respetar siempre las siguientes reglas relativas a variantes y sincronización e-commerce:

## 1. Sincronización Web y Variantes (POST /api/integrations/sync-product)
- El servidor espera y procesa productos de forma variable con una estructura anidada de variantes en lugar de artículos planos individuales si tienen la clave `variants` o `variantes`.
- Se debe enviar un único objeto de producto mapeado con su código base (SKU o código de barras del producto base), el cual contiene el arreglo interno de variantes bajo la clave `variants`.
- La sincronización inteligente en el backend detecta automáticamente los cambios y re-enruta las solicitudes de SKUs de variantes al producto padre para mantener unificado el stock de WooCommerce/E-commerce sin crear productos sueltos e independientes en la web.

## 2. Creación e Inserción de Variantes en la Base de Datos Local
- Todas las variantes (por ejemplo, talles y colores como `J118-M-AZUL` y `J118-L-ROSA`) se deben guardar de forma individual y explícita en la base de datos local (PostgreSQL / Mock) como filas independientes con su stock, talle, color y código de barra correspondientes.
- **REGLA CRÍTICA:** Al procesar las variantes del JSON de sincronización o de stock, **NUNCA** omitas ni saltes el guardado de una variante si su SKU coincide exactamente con el código del producto padre (por ejemplo, variante `J118` del producto padre `J118`). Debe crearse el registro con todos sus datos específicos de talle, color y stock de manera independiente en la tabla local.

## 3. Visualización en el Catálogo e Inventario
- El catálogo principal muestra de forma plana tanto el artículo base como sus variantes como filas independientes en la cuadrícula para facilitar la edición de stock y la venta directa individual por talle/color.
