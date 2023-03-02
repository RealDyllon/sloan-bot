FROM node:16-alpine as builder

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package.json yarn.lock src/**/* ./

RUN yarn install

RUN yarn tsc

FROM node:16-alpine AS runner
WORKDIR /app

COPY --from=builder /app/dist ./dist

CMD ["node", "dist/bot.js"]

