FROM ubuntu
WORKDIR /app
COPY ./target/release/node-template /app/node-template
CMD ["/app/node-template", "--dev", "--ws-external"]
