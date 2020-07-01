# API interface for both the UI and automated data collection

## Deploy
```bash
oc new-app \
  --name=bctw-api \
  --context-dir=api \
  https://github.com/bcgov/bctw-api.git
```