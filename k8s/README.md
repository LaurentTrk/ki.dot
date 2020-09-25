** Work in progress **
```shell script

# Ki.Dot Adapter, send Chainlink results to Substrate Node
# Deploy kidot-adapter
kubectl create cm kidot-adapter --from-env-file=kidot-adapter.env
kubectl apply -f kidot-adapter.yaml
kubectl expose deployment kidot-chainlink-adapter --port=8080 --target-port=8080

# Update the adapter version
kubectl set image deployment kidot-chainlink-adapter substrate-adapter=laurenttrk/substrate-adapter:2.0.0-alpha.6.5
```
