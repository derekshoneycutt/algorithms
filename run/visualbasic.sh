#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}

mkdir -p output
cp "$fileName" ./output/
cd ./output

echo "<Project Sdk=\"Microsoft.NET.Sdk\">
<PropertyGroup>
  <OutputType>Exe</OutputType>
  <RootNamespace>Main</RootNamespace>
  <TargetFramework>net10.0</TargetFramework>
</PropertyGroup>
</Project>" > "$fileNameWithoutExt.vbproj"

dotnet run -- $other_params

cd ..
