#!/bin/bash

CURRENT_DIRECTORY=$PWD
for f in $(find ../../. -name '_update.sh'); do
    cd $(dirname $f)
    sh "$f"
done
cd "$CURRENT_DIRECTORY"