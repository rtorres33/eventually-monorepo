#! /bin/sh

set -e

readonly lib="$1"
readonly target="libs/${lib}"

if [[ $# -eq 0 ]]; then
    echo "Missing lib name"
    exit 1
fi;

if [[ ! -d "${target}" ]]; then
    echo "Invalid lib name: [${lib}]"
    exit 1
fi; 

echo ">>> building project..."
yarn build

version=$(npm view @rotorsoft/${lib} version)
echo ">>> publishing ${lib} version ${version} ..."
yarn "${target}" npm publish --access public

if [ $? -eq 0 ]; then
    echo ">>> DONE!"
fi

