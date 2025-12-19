ARG node_image=node:18.17.0-alpine
FROM ${node_image} AS builder
LABEL maintainer="astrabit.io"

# Create a user and add it to group
RUN addgroup -S astrabit && adduser -S astrabit -G astrabit

WORKDIR /srv/app

ARG NODE_ENV=production

ENV NODE_ENV=${NODE_ENV}

# Change applications to no longer use package managers at runtime
RUN apk --purge del apk-tools

COPY package*.json ./

RUN npm pkg delete scripts.postinstall && npm ci --omit=dev

# NOTE: everything but `!.git/{HEAD,ref}` in .dockerignore
COPY .git /.app-version

COPY dist/ ./dist

FROM ${node_image} as runtime

WORKDIR /srv/app

COPY --from=builder /srv/app/dist /srv/app/dist
COPY --from=builder /srv/app/node_modules /srv/app/node_modules
COPY --from=builder /.app-version /.app-version


CMD [ "node", "/srv/app/dist/src/main" ]

