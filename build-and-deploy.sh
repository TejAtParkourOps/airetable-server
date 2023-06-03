#!/bin/bash
set -e

# arguments:
IMAGE_NAME=web
HEROKU_APP=parkour-ops-poc
TAG="registry.heroku.com/${HEROKU_APP}/${IMAGE_NAME}"

# prettier...
npm run format

# ensure clean git
if output=$(git status --porcelain) && [ -z "$output" ]; then
  # Working directory clean
  exit 0
else 
  # Uncommitted changes
  echo "Please commit changes to Git repository before deploying!"
  exit 1
fi

# build docker image and push to Heroku image registry
docker buildx build --platform linux/amd64 -t "${TAG}" .
docker push "${TAG}"
# does not work for cross-platform docker builds
#heroku container:push --app parkour-ops-poc "${TAG}"

# tell Heroku to release image for deployment
heroku container:release --app ${HEROKU_APP} "${IMAGE_NAME}"