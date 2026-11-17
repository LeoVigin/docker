# Docker Movie List

This is an API about kits and tools you put inside using Java 21.

## Installation & Start

- Download the folder or clone the repository using

- Download the folder or clone the repository using

```
clone https://github.com/LeoVigin/docker-movie-list.git
```

- Open the project in any local development server
- Create the .env files at the root of the folder adding:

```
POSTGRES_USER=Movies
POSTGRES_PASSWORD=ThisisaMovie
POSTGRES_DB=Movies
```

- Have Docker installed
- Run the image, containers and database on Docker using:

```
docker compose up -d --build
```

- Open your localhost:3000 to access the front end and localhost:8000 to access the Adminer interface
- To connect to Adminer, choose 'PostgreSQL' as the systeme and use the credentials you wrote in the .env (PGADMIN...)
- When connected to the Adminer interface, click on the 'Movie' table and then on 'Show data' to access the data

## Authors

@Gabriel-L-F <br>
@LeoVigin <br>
