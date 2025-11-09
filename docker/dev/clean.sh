#!/bin/bash

CURRENT_DIRECTORY=$PWD
for f in $(find ../../. -name '_clean.sh'); do
    cd $(dirname $f)
    sh "$f"
done
cd "$CURRENT_DIRECTORY"