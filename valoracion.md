## Backlog de mejoras de Valoración Catastral

- **Mensajes en Valor Referencia (otras vistas)**  
  - Aplicar la misma lógica de mensajes que en `Valoración Catastral` al resto de pantallas donde se muestra `valor_referencia` (por ejemplo, resumen de expediente o exportación si se muestra allí).
  - Diferenciar explícitamente:
    - Pendiente de consultar Catastro.
    - Consultado pero sin valor disponible (limitación del servicio, sobre todo en rústicos).

- **Agrupar inmuebles por referencia catastral / finca**  
  - Detectar propiedades que comparten la misma `referencia_catastral` (o los 14 primeros caracteres de la RC de finca).
  - Mostrar un agrupado visual (bloque por finca) o un indicador tipo “Comparte RC con N inmuebles más”.
  - Evitar que el usuario interprete varias tarjetas urbanas/rústicas como inmuebles completamente independientes cuando en realidad son participaciones de la misma finca o edificio.

- **Resumen por tipo de inmueble y cobertura**  
  - En el encabezado del centro de valoración mostrar:
    - Nº de inmuebles urbanos vs rústicos.
    - Nº de inmuebles con valor de referencia calculado vs sin valor.
    - Porcentaje de cobertura: inmuebles con Catastro consultado / total.

- **Explicación del tipo de “Valor Referencia”**  
  - Aclarar con un tooltip o texto de ayuda que:
    - El valor que se muestra es una **estimación interna heurística**, basada en `uso`, `superficie` y `año` devueltos por Catastro.
    - No es necesariamente el “Valor de Referencia” oficial de la DGC, aunque siga una lógica parecida para el análisis fiscal.

- **Heurística específica para inmuebles rústicos**  
  - Diseñar un cálculo alternativo cuando `tipo_bien = RU` y no hay `sfc`:
    - Posible estrategia: usar superficie declarada en la escritura (si se extrae) y tablas de €/ha según tipo de cultivo / uso (mínimo hard-codeado para demo).
    - Marcar visualmente que se trata de una valoración de suelo rústico y no de construcción urbana.

- **Indicadores visuales adicionales de riesgo fiscal**  
  - Añadir badges o iconos resumidos por tarjeta:
    - “Por debajo del valor de referencia” (verde).
    - “Muy por debajo” (rojo / alerta fuerte, por ejemplo desviación > 50 %).
  - Permitir ordenar o filtrar la cuadrícula de inmuebles por desviación fiscal.

- **Integración con exportación/reporting**  
  - Incluir en las hojas de exportación (Excel/CSV):
    - `valor_referencia`, `desviacion_fiscal`, `alerta_fiscal`.
    - Campo derivado que explique el motivo cuando no hay valor (`sin_superficie_en_catastro`, `no_consultado`, etc.).

- **UX de consulta masiva (“Consultar Todos”)**  
  - Añadir información de progreso global:
    - Barra o indicador textual fuera del botón (por ejemplo: “Consultando 3/10 inmuebles…”).
  - Posibilidad de reintentar sólo los que fallaron si Catastro devuelve errores puntuales.

