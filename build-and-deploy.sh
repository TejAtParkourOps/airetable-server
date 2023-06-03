#!/bin/bash
set -e

# arguments:
IMAGE_NAME=web
HEROKU_APP=parkour-ops-poc
TAG="registry.heroku.com/${HEROKU_APP}/${IMAGE_NAME}"

# prettier...
npm run format

# ensure clean git
if output=$(git status --porcelain) && [ -n "$output" ]; then
    echo "Please commit changes to Git repository before deploying!"
    exit 1
fi

# build docker image
# note: this uses global .npmrc file and injects it as a Docker build secret, see: https://docs.npmjs.com/docker-and-private-modules
docker buildx build --platform "linux/amd64" -t "${TAG}" --secret "id=npmrc,src=${HOME}/.npmrc" .

# push to Heroku image registry
# below command does not work for cross-platform docker builds, so use 'docker push' instead
#heroku container:push --app parkour-ops-poc "${TAG}"
docker push "${TAG}"

# tell Heroku to release image for deployment
heroku container:release --app ${HEROKU_APP} "${IMAGE_NAME}"

# bump up patch number
npm version patch

# echo success
echo "Deployment successful!"