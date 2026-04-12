#! /bin/sh

# Print shared Docker support policy text used by run.sh and init.sh help output.
print_usage_docker_policy_common() {
  echo "  Officially supported Docker platforms:"
  echo "    linux/amd64  -- fully supported. The repository Dockerfile is the canonical"
  echo "                   reference implementation for this platform."
  echo "    linux/arm64  -- limited support. May work via emulation or a compatible image"
  echo "                   that honors the runner contract below; not guaranteed."
  echo ""
  echo "  Other platforms (for example windows containers) have no supported path today."
  echo ""
  echo "  Docker runner contract (required for support):"
  echo "    - Linux container running as root."
  echo "    - Image writes DEREKALGOS_* defaults to /root/.bash_profile at build time"
  echo "      using conditional guards ([ -z \"\$VAR\" ] && export VAR=\"...\")."
  echo "    - run.sh loads those defaults by sourcing ~/.bash_profile on Linux."
  echo ""
}
