# Documentación de configuración local del proyecto

## Opciones de instalación

### 1. Script automático
Puedes usar el script automático para instalar todas las dependencias y configurar el proyecto de manera rápida. Simplemente ejecuta `./install.sh` desde la raíz del proyecto.

### 2. Manual paso a paso
Si prefieres hacerlo manualmente, sigue estos pasos:

1. Clona el repositorio:
   ```bash
   git clone https://github.com/AlbertiJ/bot-templates-python.git
   cd bot-templates-python
   ```
2. Instala las dependencias requeridas:
   ```bash
   pip install -r requirements.txt
   ```
3. Configura las variables de entorno como se indica en la sección de [Variables de entorno](#variables-de-entorno).

### 3. Acceso rápido
Para ejecutar el proyecto rápidamente, asegúrate de que las variables de entorno estén configuradas correctamente y luego ejecuta:
```bash
python app.py
```

## Variables de entorno

Asegúrate de configurar las siguientes variables de entorno antes de ejecutar el proyecto. Estos son los valores por defecto:

- `PORT=5173`
- `BASE_PATH=/`

Puedes configurarlas en tu terminal o mediante un archivo `.env`.

## Scripts disponibles

- `start`: Inicia la aplicación.
- `test`: Ejecuta las pruebas.
- `lint`: Analiza el código en busca de problemas de estilo.

## Tecnologías utilizadas

Este proyecto utiliza las siguientes tecnologías:

- Python
- Flask
- Docker

## Solución de problemas

### Problemas comunes:
1. **Error de puerto ocupado**: Asegúrate de que no hay otra aplicación utilizando el puerto configurado.
2. **Problemas de dependencias**: Revisa que todas las dependencias estén correctamente instaladas desde el `requirements.txt`.
3. **Errores de configuración**: Verifica que las variables de entorno estén correctamente configuradas y accesibles por el entorno de ejecución.

Cualquier otro error que encuentres, consulta la documentación oficial de las herramientas utilizadas o crea un problema en este repositorio.