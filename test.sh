#!/bin/bash

# Make sure the script runs in the directory in which it is placed
DIR=$(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
cd $DIR

echo "Running MqttBridge tests.."

# Run tests
# ./test/unit/test.sh
./test/integration/test.sh

exit $?
