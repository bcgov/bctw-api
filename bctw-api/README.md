# API interface for both the UI and automated data collection

## Deploy
```bash
oc new-app \
  --name=bctw-api \
  --context-dir=api \
  https://github.com/bcgov/bctw-api.git
```

## Develop
Port forward database to development computer
```bash
oc get pods # Find the pod name
oc port-forward pod-name 5432:5432
npm run start:dev
```
