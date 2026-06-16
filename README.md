# TFM-Airports Backend

Backend Node/Express para el proyecto TFM Airports.

## Docker local

1. Crea el archivo `.env` a partir de `.env.example`.
2. Levanta backend, MongoDB y Redis:

```bash
docker compose up -d --build
```

3. Comprueba el servicio:

```bash
curl http://localhost:3000/health
```

La URL `http://localhost:3000/` devuelve un JSON simple para verificar el despliegue desde navegador.

## Imagen para Docker Hub

Sustituye `<usuario-dockerhub>` por tu usuario real:

```bash
docker build -t <usuario-dockerhub>/tfm-airports-backend:1.0.0 .
docker login
docker push <usuario-dockerhub>/tfm-airports-backend:1.0.0
```

## Compute Engine

Pasos mínimos para la entrega:

1. Crea una instancia de Compute Engine en una región cercana.
2. Reserva una IP externa estática y asígnala a la instancia.
3. Abre el puerto `3000` en las reglas de firewall de Google Cloud.
4. Entra por SSH en la instancia.
5. Instala Docker y el plugin de Compose si la imagen de la VM no los incluye.
6. Copia o clona este backend en la VM.
7. Crea el archivo `.env` en la VM con las claves necesarias.
8. Ejecuta:

```bash
docker compose up -d --build
```

9. Comprueba en navegador:

```text
http://<IP_EXTERNA>:3000/
```

Capturas que pide el PDF:

- Listado de instancias de Compute Engine donde se vea la IP externa.
- Navegador accediendo por HTTP al servicio desplegado.
- Resumen de la instancia de Compute Engine.
- IP externa reservada.

## Despliegue con GitHub Actions y registry

El workflow `.github/workflows/docker-publish.yml` construye la imagen Docker y la publica en GitHub Container Registry cuando subes cambios a `main` o `master`.

La imagen queda con esta forma:

```text
ghcr.io/<usuario-github>/<repositorio>:latest
```

En la VM no necesitas clonar el proyecto completo si usas la imagen publicada. Solo necesitas tener un `docker-compose.prod.yml` y un `.env`.

Ejemplo de `.env` en la VM:

```env
PORT=3000
MONGO_URI=mongodb://mongo:27017/tfm_airports
REDIS_URL=redis://redis:6379
SHARE_TTL_SECONDS=86400
GEMINI_API_KEY=tu_clave
GEMINI_MODEL=gemini-2.5-flash
UNSPLASH_ACCESS_KEY=tu_clave
CORS_ORIGIN=*
BACKEND_IMAGE=ghcr.io/<usuario-github>/<repositorio>:latest
```

Arranque en la VM:

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Si el paquete de `ghcr.io` está privado, primero inicia sesión en la VM:

```bash
echo <TOKEN_GITHUB> | docker login ghcr.io -u <usuario-github> --password-stdin
```
