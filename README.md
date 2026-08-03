# setup

1. `yarn install`
2. `cp .env.example .env`
3. `docker run --name galaguerre-postgres -e POSTGRES_DB=galaguerre -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 -d postgres:17-alpine`
4. docker exec galaguerre-postgres createdb -U postgres galaguerre_test
5. node ace migration:run
6. node ace db:seed
7. yarn dev
8. docker start galaguerre-postgres

# docs

- [Journal des expériences sur l'IA](docs/ai-experiments.md) — ce qui a été essayé, mesuré et
  **rejeté**. À lire avant de toucher à l'IA « Expert » : plusieurs hypothèses séduisantes y sont
  déjà réfutées, chiffres à l'appui.

