# table-riconciliator-service

## Workflows
Two workflows are defined for this repository:

1. **push-image**: triggered on a push action on `dev` branch. This workflow builds a docker image with the backend and frontend builds and pushes it to both DockerHub and GitHub Container.

2. **deploy-pipeline**: triggered on (TBD: probably on push on `main` branch or when tagging a commit with a new release). This workflow adds a step to the previous pipeline which pulls the **release** image from GitHub Container and builds a container on a remote host.

**Notes about the pipelines**: since the backend serves both the API and the frontend static files, the only way to have an updated image is to build both frontend and backend for each repository when a new version is released.

#### Skip workflows
To skip workflows add to the commit message `[skip ci]`. This way it won't be triggered.

## Pulling an image

### Pulling an image from DockerHub
The image is available here: https://hub.docker.com/repository/docker/i2tunimib/i2t.

1. Login to DockerHub:
```bash
docker login i2tunimib
```
2. As password insert the DockerHub token. You can find it [here](https://drive.google.com/file/d/1i5OQcZP-MeiwKtVomkBrBoqmOD2Q6ETX/view?usp=sharing).
3. Pull the image:

- using docker-compose:
```bash
docker-compose pull candidate
```
- using docker:
```bash
docker pull i2tunimib/i2t
```
4. Build container:

- using docker-compose:
```bash
docker-compose up -d candidate
```

- using docker:
```bash
docker run -p 3002:3002 -d i2tunimib/i2t
```


### Pulling an image from GitHub Container
The image is available here: https://github.com/I2Tunimib/I2T-backend/pkgs/container/i2t.

1. Create a new **Personal Access Token** with `write:packages` permissions. https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token
2. Save your token as environment variable:
```bash
export CR_PAT=YOUR_TOKEN
```
3. Login to the Container registry:
```bash
echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin
```
4. Pull the image:

- using docker-compose:
```bash
docker-compose pull release
```
- using docker:
```bash
docker pull ghcr.io/i2tunimib/i2t:latest
```
5. Build container:
- using docker-compose:
```bash
docker-compose up -d release
```
- using docker:
```bash
docker run -p 3002:3002 -d ghcr.io/i2tunimib/i2
```

**N.B.:** since GitHub has rate limits when pulling images from the container try to keep the GitHub image for release only (i.e.: automatically deployed by the pipeline on a new release)

## Build an image locally

1. Be sure to build the frontend application https://github.com/I2Tunimib/I2T-frontend and move the build folder in the root of this repository.
2. Build an image:
```bash
docker-compose build ['candidate' | 'release']
``` 
**candidate** and **release** build the same image. What changes is the registry where it's going to be pushed (if pushed). Candidate pushes to DockerHub, release pushes to GitHub.

3. Build a container with the built image:
```bash
docker-compose up -d ['candidate' | 'release']
```
