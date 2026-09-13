# Docker & PostgreSQL Development Guide

## Purpose

Docker is used in the Invoice Management System to provide a consistent
local **PostgreSQL development database**. The Next.js/TypeScript
application currently runs on the host machine; only PostgreSQL is
containerized.

``` text
Next.js / TypeScript application
        |
        | localhost:5432
        v
Docker -> PostgreSQL 18 (ims-postgres-dev)
        |
        v
Docker Volume: postgres_dev_data
```

## Docker Compose Configuration

The project uses `docker-compose.yml`:

``` yaml
services:
  postgres-dev:
    image: postgres:18
    container_name: ims-postgres-dev
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ims_dev
      POSTGRES_PASSWORD: ims_dev_password
      POSTGRES_DB: invoice_management_dev
    volumes:
      - postgres_dev_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ims_dev -d invoice_management_dev"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres_dev_data:
```

Key concepts:

- `postgres-dev`: Docker Compose service.
- `ims-postgres-dev`: container name.
- `postgres:18`: PostgreSQL Docker image.
- `5432:5432`: host port to container port.
- `postgres_dev_data`: persistent database storage.

## Docker Commands

Start PostgreSQL:

``` bash
docker compose up -d
```

Check status:

``` bash
docker compose ps
```

Stop and remove containers without deleting the database volume:

``` bash
docker compose down
```

Restart:

``` bash
docker compose restart
```

View running containers:

``` bash
docker ps
```

View all containers:

``` bash
docker ps -a
```

View PostgreSQL logs:

``` bash
docker compose logs postgres-dev
```

Follow logs:

``` bash
docker compose logs -f postgres-dev
```

List volumes:

``` bash
docker volume ls
```

Completely remove containers and database volume:

``` bash
docker compose down -v
```

> **Warning:** `-v` deletes the local PostgreSQL data.

## PostgreSQL Connection

``` text
Host:     localhost
Port:     5432
Database: invoice_management_dev
Username: ims_dev
Password: ims_dev_password
Schema:   public
```

Prisma uses the connection string from `.env`:

``` env
DATABASE_URL="postgresql://ims_dev:ims_dev_password@localhost:5432/invoice_management_dev?schema=public"
```

`.env` must not be committed to Git.

## Docker and Prisma Responsibilities

``` text
docker-compose.yml -> PostgreSQL server
                          ^
                          | DATABASE_URL
                          |
                    Prisma Client
                          ^
                          |
                    schema.prisma
```

Docker runs PostgreSQL. Prisma defines and interacts with the database
schema.

## Prisma Schema

The database design is defined in:

``` text
prisma/schema.prisma
```

Validate the schema:

``` bash
npx prisma validate
```

Format it:

``` bash
npx prisma format
```

## Generate Prisma Client

``` bash
npx prisma generate
```

The project uses a custom output:

``` prisma
generator client {
  provider = "prisma-client"
  output   = "../app/generated/prisma"
}
```

Generated client location:

``` text
app/generated/prisma/
```

It is ignored by Git:

``` gitignore
/app/generated/prisma
```

Regenerate it after cloning/installing the project.

## `prisma db push`

During initial prototyping:

``` bash
npx prisma db push
```

This directly synchronizes `schema.prisma` with PostgreSQL, but **does
not create migration history**.

Once migration-based development begins, schema changes should normally
use migrations instead of `db push`.

## Prisma Migrations

Create and apply a development migration:

``` bash
npx prisma migrate dev --name init
```

Migration files are stored under:

``` text
prisma/
└── migrations/
    └── <timestamp>_init/
        └── migration.sql
```

Migration files must be committed to Git.

Normal future workflow:

``` text
Modify schema.prisma
        |
        v
npx prisma migrate dev --name <meaningful_name>
        |
        v
Migration created + database updated
        |
        v
Prisma Client regenerated
        |
        v
Commit schema + migration
```

Check migration status:

``` bash
npx prisma migrate status
```

## Why Drift Occurred Initially

The database was initially created using:

``` bash
npx prisma db push
```

Then:

``` bash
npx prisma migrate dev --name init
```

reported `Drift detected`.

Reason:

``` text
Database schema = tables already exist
Migration history = no migration describing them
```

Therefore the actual database did not match the schema expected from
migration history.

Because this was a disposable development database, it was reset so
migrations could become the schema-history source.

## Resetting the Development Database

``` bash
npx prisma migrate reset
```

This removes development data and reapplies migrations.

> Use this only for a disposable development database. Do not treat it
> as a production command.

## Seeding

Run development seed data with:

``` bash
npx prisma db seed
```

The configured seed command executes:

``` text
npx tsx prisma/seed.ts
```

Seed file:

``` text
prisma/seed.ts
```

Because Prisma Client has a custom output directory, `seed.ts` imports
it from:

``` ts
import { PrismaClient } from "../app/generated/prisma/client";
```

instead of:

``` ts
import { PrismaClient } from "@prisma/client";
```

The default import caused the `@prisma/client did not initialize yet`
error because the generated client is located in the project's custom
output directory.

## Working on Another Computer

The physical database is not transferred through Git.

Git should contain:

``` text
docker-compose.yml
prisma/schema.prisma
prisma/migrations/
prisma/seed.ts
package.json
package-lock.json
```

General setup on another development computer:

``` bash
git clone <repository>
cd invoice-management-system
npm install
docker compose up -d
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

Create `.env` locally because it is ignored by Git.

Each computer has its own Docker PostgreSQL volume, while Git shares the
schema, migrations, and seed definitions.

## Command Reference

  Purpose                          Command
  -------------------------------- ----------------------------------------
  Start PostgreSQL                 `docker compose up -d`
  Check status                     `docker compose ps`
  Stop containers                  `docker compose down`
  Restart                          `docker compose restart`
  View running containers          `docker ps`
  View all containers              `docker ps -a`
  View DB logs                     `docker compose logs postgres-dev`
  Follow DB logs                   `docker compose logs -f postgres-dev`
  List volumes                     `docker volume ls`
  Destroy containers + DB volume   `docker compose down -v`
  Validate Prisma                  `npx prisma validate`
  Format Prisma                    `npx prisma format`
  Generate client                  `npx prisma generate`
  Prototype DB sync                `npx prisma db push`
  Create/apply migration           `npx prisma migrate dev --name <name>`
  Check migrations                 `npx prisma migrate status`
  Reset development DB             `npx prisma migrate reset`
  Run seed                         `npx prisma db seed`

## Rule to Remember

``` text
Docker Compose     -> creates/runs the PostgreSQL environment
Prisma schema      -> describes the database
Prisma migrations  -> version the database structure
Prisma Client      -> lets TypeScript communicate with PostgreSQL
Seed               -> creates predictable development data
Git                -> versions configuration, schema, migrations and seed
Docker Volume      -> stores the actual local PostgreSQL data
```
