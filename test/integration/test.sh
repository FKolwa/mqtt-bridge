#!/bin/bash

# Make sure the script runs in the directory in which it is placed
DIR=$(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
cd $DIR

# Create project name using current time
RAND=$(cat /dev/urandom | env LC_CTYPE=C tr -dc '0-9' | fold -w 8 | head -n 1)
PROJECT=ci${RAND}

# Extract name of project (= microservice name)
SERVICE=${DIR%%/test/*}
SERVICE=${SERVICE##*/}

# kill and remove any running containers
cleanup () {
  docker-compose -p ${PROJECT} down -t 0
}

# run the composed services
docker-compose build && docker-compose -p ${PROJECT} up -d
if [ $? -ne 0 ] ; then
  printf "${RED}Docker Compose Failed (${SERVICE})${NC}\n"
  exit -1
fi

docker logs -f ${PROJECT}_${SERVICE}_1

TEST_EXIT_CODE=`docker inspect ${PROJECT}_${SERVICE}_1 --format='{{.State.ExitCode}}'`

# inspect the output of the test and display respective message
if [ -z ${TEST_EXIT_CODE+x} ] || [ "$TEST_EXIT_CODE" != "0" ] ; then
  printf "Tests Failed - Exit Code: $TEST_EXIT_CODE\n"
else
  printf "Tests Passed\n"
fi
# Cleanup
cleanup
# exit the script with the same code as the test service code
exit $TEST_EXIT_CODE
