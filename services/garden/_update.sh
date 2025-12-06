arg1=$1
if [ -z "$arg1" ]; then
arg1=local
fi

if [ "$arg1" = "local" ]; then
  echo "LOCAL"
  cp -r ../../config/local/service-template-env-local.yaml .env
  elif [ "$arg1" = "dev" ]; then
  echo "DEV"
  cp -r ../../config/dev/service-template-env-dev.yaml .env
  elif [ "$arg1" = "prod" ]; then
  echo "PROD"
  cp -r ../../config/prod/service-template-env-prod.yaml .env
fi