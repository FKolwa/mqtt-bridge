#!/bin/bash

# Change into containing folder to assure relative paths resolve
CURRENT_DIR=$(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
cd $CURRENT_DIR

# Random prefix to avoid overlaps
PROJECT=$RANDOM
NAME=${CURRENT_DIR%%/test/*}
NAME=${PROJECT}_${NAME##*/}_1

# run the composed services
docker-compose build && docker-compose -p ${PROJECT} up -d
if [ $? -ne 0 ] ; then
  printf "\033[0;31mDocker Compose Failed\033[0m\n"
  exit -1
fi

docker logs -f ${NAME}

EXIT_CODE=`docker inspect ${NAME} --format='{{.State.ExitCode}}'`

if [ -z ${EXIT_CODE+x} ] || [ "$EXIT_CODE" != "0" ] ; then
  printf "\033[0;31mTests Failed - Exit Code: $EXIT_CODE\033[0m\n"
else
  printf "\033[0;32mTests Passed\033[0m\n"
fi
# Cleanup
docker-compose -p ${PROJECT} down -t 0
# exit the script with the same code as the test service code
exit $EXIT_CODE
