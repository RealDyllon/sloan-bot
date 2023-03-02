FROM node:16-alpine as builder

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY . .

RUN yarn install

RUN yarn tsc

RUN pwd

RUN ls -a

#FROM node:16-alpine AS runner
#WORKDIR /app
#
#COPY --from=builder /app/dist ./dist
#COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "dist/bot.js"]

