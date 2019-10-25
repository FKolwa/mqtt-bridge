#!/bin/bash

# Change into containing folder to assure relative paths resolve
CURRENT_DIR=$(dirname `[[ $0 = /* ]] && echo "$0" || echo "$PWD/${0#./}"`)
cd $CURRENT_DIR

echo "Running MqttBridge tests.."

# Run tests
./test/*/test.sh

exit $?
