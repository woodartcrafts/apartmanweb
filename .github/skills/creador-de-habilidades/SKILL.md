---
name: creador-de-habilidades
description: 'Genera nuevas habilidades (skills) para agentes de IA siguiendo la estructura estándar  en español'
---
# Creador de Habilidades

Esta habilidad te permite crear nuevas habilidades para agentes de IA de manera estructurada y consistente. Todas las instrucciones y documentación generadas estarán en **español**.

## Estructura de una Habilidad

Cada habilidad debe seguir esta estructura de carpetas:

```
nombre-de-habilidad/
├── SKILL.md           # (Requerido) Archivo principal de instrucciones
├── scripts/           # (Opcional) Scripts auxiliares y utilidades
├── examples/          # (Opcional) Ejemplos de uso e implementaciones
└── resources/         # (Opcional) Archivos adicionales, plantillas o assets
```

## Formato del Archivo SKILL.md

El archivo `SKILL.md` es el corazón de cada habilidad y debe seguir este formato:

```markdown
---
name: Nombre de la Habilidad
description: Descripción breve de lo que hace la habilidad
---

# Título de la Habilidad

[Contenido detallado en markdown con las instrucciones de la habilidad]
```

### Frontmatter YAML Requerido

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre descriptivo de la habilidad (En español) |
| `description` | Descripción corta de una línea sobre la funcionalidad |

## Proceso de Creación de una Nueva Habilidad

Cuando el usuario te pida crear una nueva habilidad, sigue estos pasos:

### Paso 1: Recopilar Información

Antes de crear la habilidad, asegúrate de entender:

1. **Propósito**: ¿Qué problema resuelve esta habilidad?
2. **Alcance**: ¿Qué tareas específicas debe poder realizar?
3. **Contexto**: ¿En qué situaciones se usará?
4. **Requisitos**: ¿Necesita scripts, ejemplos o recursos adicionales?
5. **Restricciones**: ¿Hay limitaciones o consideraciones especiales?

### Paso 2: Definir la Estructura

Determina qué componentes necesita la habilidad:

- **SKILL.md**: Siempre requerido
- **scripts/**: Solo si se necesitan automatizaciones
- **examples/**: Recomendado para habilidades complejas
- **resources/**: Para plantillas, imágenes u otros assets

### Paso 3: Escribir el Contenido

El archivo `SKILL.md` debe incluir:

1. **Frontmatter** con nombre y descripción en español
2. **Introducción** explicando el propósito
3. **Requisitos previos** (si aplica)
4. **Instrucciones paso a paso** claras y detalladas
5. **Ejemplos de uso** (cuando sea útil)
6. **Consideraciones especiales** o advertencias
7. **Solución de problemas** (opcional)

### Paso 4: Crear los Archivos

1. Crea la carpeta con un nombre en `kebab-case` (minúsculas con guiones)
2. Escribe el archivo `SKILL.md`
3. Agrega carpetas adicionales según sea necesario
4. Proporciona ejemplos si la habilidad es compleja

## Plantilla Base para SKILL.md

Usa esta plantilla como punto de partida:

```markdown
---
name: [Nombre en Español]
description: [Descripción breve en español]
---

# [Nombre de la Habilidad]

[Breve descripción del propósito y utilidad de esta habilidad]

## Requisitos Previos

- [Requisito 1]
- [Requisito 2]

## Instrucciones

### 1. [Primer Paso]

[Instrucciones detalladas]

### 2. [Segundo Paso]

[Instrucciones detalladas]

## Ejemplos de Uso

### Ejemplo 1: [Título del ejemplo]

[Descripción y código/comandos]

## Consideraciones Especiales

> [!IMPORTANT]
> [Información crítica que el usuario debe conocer]

## Solución de Problemas

| Problema | Solución |
|----------|----------|
| [Problema común 1] | [Solución 1] |
| [Problema común 2] | [Solución 2] |
```

## Buenas Prácticas

1. **Claridad**: Escribe instrucciones que cualquier persona pueda seguir
2. **Completitud**: No asumas conocimiento previo del usuario
3. **Consistencia**: Usa el mismo formato y estilo en toda la habilidad
4. **Ejemplos**: Incluye ejemplos prácticos cuando sea posible
5. **Idioma**: Todo el contenido debe estar en español
6. **Nombres de carpeta**: Usa `kebab-case` para los nombres de carpetas
7. **Modularidad**: Separa scripts y recursos en sus propias carpetas

## Alertas de GitHub

Utiliza las siguientes alertas para destacar información importante:

```markdown
> [!NOTE]
> Información contextual o detalles de implementación

> [!TIP]
> Sugerencias de optimización o mejores prácticas

> [!IMPORTANT]
> Requisitos esenciales o información crítica

> [!WARNING]
> Cambios que rompen compatibilidad o problemas potenciales

> [!CAUTION]
> Acciones de alto riesgo que podrían causar pérdida de datos
```

## Ejemplo Completo

Aquí hay un ejemplo de una habilidad sencilla:

```markdown
---
name: Generador de README
description: Crea archivos README.md profesionales para proyectos de software
---

# Generador de README

Esta habilidad te ayuda a crear archivos README.md completos y profesionales para cualquier proyecto de software.

## Instrucciones

### 1. Analizar el Proyecto

Examina la estructura del proyecto para identificar:
- Tipo de proyecto (web, CLI, librería, etc.)
- Tecnologías utilizadas
- Dependencias principales
- Scripts disponibles

### 2. Recopilar Información

Pregunta al usuario sobre:
- Nombre del proyecto
- Descripción breve
- Cómo instalar y usar el proyecto
- Información de contribución

### 3. Generar el README

Crea un README.md que incluya:
- Título y descripción
- Badges relevantes
- Instrucciones de instalación
- Ejemplos de uso
- Información de licencia

> [!TIP]
> Adapta el nivel de detalle según el tipo de proyecto
```

