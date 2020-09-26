FROM ubuntu
WORKDIR /app
COPY ./target/release/kidot-substrate-node /app/kidot-substrate-node
CMD ["/app/kidot-substrate-node", "--dev", "--ws-external"]
