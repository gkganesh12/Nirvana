# SignalCraft Kubernetes Operator

This operator syncs Kubernetes CRDs to SignalCraft configuration.

## CRD

Apply the CRD:

```bash
kubectl apply -f config/crd/bases/signalcraft.io_signalcraftalertpolicies.yaml
```

## Sample

```bash
kubectl apply -f config/samples/signalcraft_v1alpha1_signalcraftalertpolicy.yaml
```

## Local Run

```bash
go run ./main.go
```

## Deploy

```bash
kubectl apply -k config
```

Update `config/manager/secret.yaml` with your API key before deploying.

## Delete Behavior

The operator uses a finalizer to delete the corresponding SignalCraft alert policy
when the CRD is deleted.

## Notes

The controller currently marks status as pending. API sync will be added in the next iteration.
