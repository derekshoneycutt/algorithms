#! /bin/bash

lang="gleam"
fileName=$1
fileNameWithoutExt="${fileName%.*}"
other_params=${@:2}

if [ "$fileName" == "clean" ]; then
  ../../../run/_clean.sh force
  exit
fi
../../../run/_clean.sh $lang "./output/build/dev/erlang/$fileNameWithoutExt/ebin/$fileNameWithoutExt.beam"
mkdir -p output

mkdir -p output/src
cp "$fileName" ./output/src/
cd ./output/

echo "name = \"$fileNameWithoutExt\"
version = \"1.0.0\"

[dependencies]
gleam_stdlib = \">= 0.44.0 and < 2.0.0\"

[dev-dependencies]
gleeunit = \">= 1.0.0 and < 2.0.0\"
" > "./gleam.toml"

echo "
packages = [
  { name = \"gleam_stdlib\", version = \"0.70.0\", build_tools = [\"gleam\"], requirements = [], otp_app = \"gleam_stdlib\", source = \"hex\", outer_checksum = \"86949BF5D1F0E4AC0AB5B06F235D8A5CC11A2DFC33BF22F752156ED61CA7D0FF\" },
  { name = \"gleeunit\", version = \"1.9.0\", build_tools = [\"gleam\"], requirements = [\"gleam_stdlib\"], otp_app = \"gleeunit\", source = \"hex\", outer_checksum = \"DA9553CE58B67924B3C631F96FE3370C49EB6D6DC6B384EC4862CC4AAA718F3C\" },
]

[requirements]
gleam_stdlib = { version = \">= 0.44.0 and < 2.0.0\" }
gleeunit = { version = \">= 1.0.0 and < 2.0.0\" }
" > "./manifest.toml"

gleam run --no-print-progress -m "$fileNameWithoutExt" -- $other_params 2> ./gleam-stderr-output

cd ..
echo "$lang" > ./output/last-lang
