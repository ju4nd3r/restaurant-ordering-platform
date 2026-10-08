# ADR 0006: Abstracción de Almacenamiento de Imágenes (Storage Provider)

## Estado

Aceptado

## Contexto

El almacenamiento de imágenes de platos debe ser flexible y desacoplado:

- En entornos cloud de producción se utiliza comúnmente Amazon S3, Google Cloud Storage o MinIO.
- En desarrollo local y CI, depender de descargas pesadas de Docker Hub (como MinIO o LocalStack) puede fallar por límites de tasa anónima de Docker Hub o requerir credenciales de login.

## Decisión

Se implementa una interfaz `StorageService` detrás de un patrón Adapter / Strategy:

1. `LocalStorageService`: Almacena imágenes en disco local (volumen montado persistente) y las sirve directamente a través de una ruta pública estática `/uploads/` en el backend o reverse proxy. No requiere contenedores externos adicionales ni conexión a internet.
2. `S3StorageService`: Implementación para producción compatible con AWS S3 y MinIO cuando se configure `STORAGE_PROVIDER=s3`.
3. En el archivo `docker-compose.yml`, se usa almacenamiento local persistente vía volumen compartido `media_data`, garantizando que `docker compose up --build` arranque al 100% sin descargas bloqueadas.

## Consecuencias

- Despliegue local y CI 100% autónomo y rápido.
- Cero fricción en máquinas nuevas sin cuenta de Docker Hub.
- Fácil transición a S3 en producción configurando únicamente variables de entorno.
