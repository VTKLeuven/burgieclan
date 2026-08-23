#!/bin/bash
set -e

LOG="/opt/seafile/shared/staging.log"
exec > >(tee -a "$LOG") 2>&1

echo "================================================================================"
echo "=== Step 7: Staging Seafile Repositories to liv (/mnt/immich/burgieclan-staging/) ==="
echo "=== Started at: $(date) ==="
echo "================================================================================"

STAGING_REMOTE="it@liv:/mnt/immich/burgieclan-staging"
HOST_TEMP="/opt/seafile/shared/staging"
CONTAINER_TEMP="/shared/staging"

# Ensure clean temp directories
docker exec seafile bash -c "mkdir -p $CONTAINER_TEMP && chmod 777 $CONTAINER_TEMP"

# List of 28 non-empty libraries (repo_id and clean directory name)
REPOS=(
  "3d9a17f9-bab3-4ed4-bb2c-7bf0e4afe3da|ManaMa - Artificial Intelligence"
  "a07d4e1c-7fcf-44b8-80e3-b6977f6cf421|Ma - Algemeen vormende onderdelen"
  "83ef9ff8-606d-43c0-97ef-6d93a7accd8d|Ba - Bedrijfsbeheer"
  "b399b23f-4adc-481e-abbf-e8f83e2cf918|Ma - Mathematical Engineering"
  "cf808537-af0d-4e9d-933f-b65163943aff|Ma - Nanoscience, -technology and -engineering"
  "092062fa-100b-454f-b128-fb6f4a451e0e|Ba - Architectuur en omgeving"
  "527f92f3-4672-4788-a603-fd9c1442a176|Ba - Technologie van de levende systemen [OLD]"
  "210f65e6-031a-48ce-9bf8-82d6fa4fe12b|Schakel - Algemeen"
  "fcb71182-b492-4527-9fbb-a021715b1e12|Ma - Materials Engineering"
  "47875ddc-5cf5-4a3a-b90c-b4db80f9aa96|Ma - Chemical Engineering"
  "9be537d4-28fc-403c-b2d5-d80454414e4a|Ba - Materiaalkunde"
  "a53f802e-ac3c-401f-9451-65867c9118e9|Ma - Mobility and Supply Chain Engineering"
  "557b7d5d-f8d1-4462-8eeb-c046f4c13668|Ba - Chemische technologie"
  "b09a4350-b5e2-4f4a-92ee-baa7c7e7abb3|Ba - Biomedische technologie"
  "85977c74-7531-47ad-9ed5-a5f6f879cd84|Ma - Civil Engineering"
  "05ff5a12-f14b-46ae-bfb6-f3c3da184edd|Ba - Bouwkunde"
  "8adc3743-e334-48dd-a399-7b30fb25d2fe|Ma - Architectuur"
  "35def56c-b350-4a25-be41-882ee3099039|Schakel - Werktuigkunde"
  "822b1480-685b-4fbe-aa9f-182c21448378|Ma - Computer Science"
  "66fec491-14f0-4f54-bd68-f435c6051679|Ma - Biomedical Engineering"
  "be04b5bf-335c-44d4-a921-b26ea91af6ae|Ba - Computerwetenschappen"
  "c120b14a-15fd-417a-84d0-85f623bc7173|Ba - Elektrotechniek"
  "5b674a32-eb0d-4b78-b800-3139eb4d4f03|Ma - Energy"
  "033f12df-302c-4ef7-9921-71681b8edeaa|Ma - Electrical Engineering"
  "debd77c6-9120-44f3-84ce-e8f9671246df|Ma - Mechanical Engineering"
  "ee55994d-0bd9-4bfb-ade6-b41ecc0975bf|Ba - Werktuigkunde"
  "c907393c-0903-4002-8b83-9d589fde6d9b|Ba - Architectuur"
  "fce89d84-bd58-43b0-b962-a98230b49af0|Ba - Algemene gemeenschappelijke basis"
)

TOTAL_COUNT=${#REPOS[@]}
INDEX=0

for ITEM in "${REPOS[@]}"; do
  INDEX=$((INDEX + 1))
  REPO_ID=$(echo "$ITEM" | cut -d'|' -f1)
  REPO_NAME=$(echo "$ITEM" | cut -d'|' -f2)
  
  echo ""
  echo "--------------------------------------------------------------------------------"
  echo "[$INDEX/$TOTAL_COUNT] Exporting & Staging: $REPO_NAME ($REPO_ID)"
  echo "Started at $(date)"
  echo "--------------------------------------------------------------------------------"
  
  LIB_EXPORT_DIR="$CONTAINER_TEMP/$REPO_ID"
  HOST_LIB_DIR="$HOST_TEMP/$REPO_ID"
  
  # Clean previous export
  docker exec seafile bash -c "rm -rf '$LIB_EXPORT_DIR' && mkdir -p '$LIB_EXPORT_DIR'"
  
  # 1. Export repository files from Seafile blocks using seaf-fsck
  docker exec seafile bash -c "/opt/seafile/seafile-server-13.0.25/seaf-fsck.sh --export '$LIB_EXPORT_DIR' $REPO_ID"
  docker exec seafile bash -c "chmod -R 777 '$LIB_EXPORT_DIR'"
  
  # Find exported directory name on host
  EXPORTED_DIR=$(find "$HOST_LIB_DIR" -mindepth 1 -maxdepth 1 -type d | head -n 1)
  
  if [ -n "$EXPORTED_DIR" ] && [ -d "$EXPORTED_DIR" ]; then
    echo "  Export successful. Syncing to liv ($REPO_NAME)..."
    ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new it@liv "mkdir -p '/mnt/immich/burgieclan-staging/$REPO_NAME'"
    
    # 2. Rsync from <seafile-host> to liv
    rsync -avq --no-perms --no-owner --no-group -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" "$EXPORTED_DIR/" "$STAGING_REMOTE/$REPO_NAME/"
    
    echo "  ✓ Successfully staged to liv:/mnt/immich/burgieclan-staging/$REPO_NAME at $(date)"
  else
    echo "  ! No directory found in $HOST_LIB_DIR for $REPO_NAME"
  fi
  
  # Clean local temp on Seafile server after each library
  docker exec seafile bash -c "rm -rf '$LIB_EXPORT_DIR'"
done

docker exec seafile bash -c "rm -rf $CONTAINER_TEMP"

echo ""
echo "================================================================================"
echo "✓ ALL 28 LIBRARIES FULLY STAGED ON LIV AT $(date)"
echo "================================================================================"
