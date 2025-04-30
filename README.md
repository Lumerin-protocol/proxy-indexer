# proxy-indexer 2.0.1
Provides a docker container service (that is currently run on ECS/Fargate) that listens for events on the Ethereum blockchain and indexes them in a Postgres database. The service is built using Node.js and uses the ethers.js library to interact with the Ethereum blockchain.
Leveraged by both wallet-desktop and Web Marketplace

## Start local

- npm i --legacy-peer-deps
- npm run dev

## Build Docker container
- docker build --build-arg ETH_NODE_URL="" --build-arg CLONE_FACTORY_ADDRESS="" --build-arg PORT="" .