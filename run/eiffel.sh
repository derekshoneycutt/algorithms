#! /bin/bash

fileName=$1
fileNameWithoutExt="${fileName%.*}"
className=${fileNameWithoutExt^^}
other_params=${@:2}
new_uuid=$(uuidgen)

mkdir -p output
cp "$fileName" ./output/
cd ./output/

echo "<?xml version=\"1.0\" encoding=\"ISO-8859-1\"?>
<system xmlns=\"http://www.eiffel.com/developers/xml/configuration-1-23-0\"
        xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"
        xsi:schemaLocation=\"http://www.eiffel.com/developers/xml/configuration-1-23-0 http://www.eiffel.com/developers/xml/configuration-1-23-0.xsd\"
        name=\"$fileName\" uuid=\"$new_uuid\">
	<target name=\"$fileName\">
		<root feature=\"make\" class=\"$className\"/>
		<file_rule>
			<exclude>/EIFGENs$</exclude>
			<exclude>/\..*$</exclude>
		</file_rule>
		<option warning=\"warning\">
			<assertions precondition=\"true\" postcondition=\"true\"
                        check=\"true\" invariant=\"true\" loop=\"true\"
                        supplier_precondition=\"true\"/>
		</option>
		<setting name=\"console_application\" value=\"true\"/>
		<precompile name=\"base_pre\" location=\"\$ISE_PRECOMP/base-scoop-safe.ecf\"/>
		<library name=\"base\" location=\"\$ISE_LIBRARY/library/base/base.ecf\"/>
		<cluster name=\"$fileName\" location=\".\\\" recursive=\"true\"/>
	</target>
</system>" > "$fileNameWithoutExt.ecf"

ec -batch -config "$fileNameWithoutExt.ecf" -finalize &> "./$fileName-last-compile"

cd "./EIFGENs/$fileName/F_code"
echo "
FIRST COMPILE FINISHED. CALLING finish_freezing
" >> "../../../$fileName-last-compile"
finish_freezing >> "../../../$fileName-last-compile"

if [[ -f "$fileName" ]]; then
  "./$fileName" $other_params
  cd ../../../../
else
  cd ../../../
  echo "FAILED TO COMPILE Eiffel. BUILD OUTPUT:"
  cat "./$fileName-last-compile"
  cd ..
fi
