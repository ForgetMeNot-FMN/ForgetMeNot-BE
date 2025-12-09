arg1=$1
if [ -z "$arg1" ]; then
arg1=local
fi

if [ "$arg1" = "local" ]; then
  echo "LOCAL"
  cp -r ../../config/local/login-service-env.yaml .env
  elif [ "$arg1" = "prod" ]; then
  echo "PROD"
  cp -r ../../config/prod/login-service-env.yaml .env
fi