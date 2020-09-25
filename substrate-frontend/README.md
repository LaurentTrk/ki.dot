# Ki.Dot Front End

See [Substrate Front End Template](https://github.com/substrate-developer-hub/substrate-front-end-template) for general instructions.

## Building Docker Image

Be sure to have the correct value for `PROVIDER_SOCKET` in the file [production.json](./src/config/production.json).

```bash
yarn install
docker build . -t laurenttrk/kidot-frontend:dev
docker push laurenttrk/kidot-frontend:dev
```

