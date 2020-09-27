** Work in progress **

See [Running Chainlink Nodes on Kubernetes and the Google Cloud Platform](https://medium.com/secure-data-links/running-chainlink-nodes-on-kubernetes-and-the-google-cloud-platform-1fab922b3a1a)


```shell script

# Chainlink Node on kovan
echo "user@example.com" > .api
echo "password" > .api
echo "my_wallet_password" > .password
kubectl create secret generic api-env --from-file=.api
kubectl create secret generic password-env --from-file=.password
kubectl apply -f kovan.yaml
kubectl expose deployment kovan-chainlink-deployment --port=6688 --target-port=6688


# Ki.Dot Initiator, send Substrate Request to Chainlink node
# Deploy kidot-initiator
kubectl create cm kidot-initiator --from-env-file=kidot-initiator.env
kubectl apply -f kidot-initiator.yaml
kubectl expose deployment kidot-chainlink-initiator --port=8080 --target-port=8080

# Update the initiator version
kubectl set image deployment kidot-chainlink-initiator external-initiator=laurenttrk/external-initiator:2.0.0-alpha.6.5

# Ki.Dot Adapter, send Chainlink results to Substrate Node
# Deploy kidot-adapter
kubectl create cm kidot-adapter --from-env-file=kidot-adapter.env
kubectl apply -f kidot-adapter.yaml
kubectl expose deployment kidot-chainlink-adapter --port=8080 --target-port=8080

# Update the adapter version
kubectl set image deployment kidot-chainlink-adapter substrate-adapter=laurenttrk/substrate-adapter:2.0.0-alpha.6.5

# Update Ki.Dot Substrate Node and FrontEnd
kubectl set image deploy/kidot-node kidot-node=laurenttrk/kidot-node:x.y.z
kubectl set image deploy/kidot-frontend kidot-frontend=laurenttrk/kidot-frontend:x.y.z
```
