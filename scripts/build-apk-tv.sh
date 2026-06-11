#!/usr/bin/env bash
#
# build-apk-tv.sh — genera la APK de FRESATITAN OPS TV.
#
# La APK de TV es independiente de la APK del operario: mismo bundle web,
# pero con applicationId distinto (com.fresatitan.ops.tv) y arrancando
# directamente en la ruta /tv. Esto permite tener ambas instaladas en el
# mismo dispositivo.
#
# El script modifica TEMPORALMENTE android/app/build.gradle, strings.xml y
# capacitor.config.ts, hace el build, y los RESTAURA al estado original.
# Si algo falla a mitad, los .bak quedan en /tmp para recuperación manual.
#
# Uso:
#   scripts/build-apk-tv.sh <version>       # ej: scripts/build-apk-tv.sh 1.0
#
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 <version> (ej: 1.0)"
  exit 1
fi

VERSION="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

# 1. Backup
cp android/app/build.gradle /tmp/build.gradle.bak
cp android/app/src/main/res/values/strings.xml /tmp/strings.xml.bak
cp capacitor.config.ts /tmp/capacitor.config.ts.bak

restore() {
  cp /tmp/build.gradle.bak android/app/build.gradle
  cp /tmp/strings.xml.bak android/app/src/main/res/values/strings.xml
  cp /tmp/capacitor.config.ts.bak capacitor.config.ts
  echo "[ok] Config restaurada"
}
trap restore EXIT

# 2. Build web con variant TV
echo "[1/4] Build web (VITE_APP_VARIANT=tv)..."
VITE_APP_VARIANT=tv npm run build >/dev/null

# 3. Modificar config Android
echo "[2/4] Aplicando applicationId TV..."
sed -i '' 's|applicationId "com.fresatitan.ops"|applicationId "com.fresatitan.ops.tv"|' android/app/build.gradle
# versionCode/Name -> usamos los que pasa el usuario
VERSION_CODE=$(date +%y%m%d)
sed -i '' "s|versionCode [0-9]*|versionCode ${VERSION_CODE}|" android/app/build.gradle
sed -i '' "s|versionName \".*\"|versionName \"${VERSION}\"|" android/app/build.gradle
# strings.xml
sed -i '' 's|com.fresatitan.ops|com.fresatitan.ops.tv|g' android/app/src/main/res/values/strings.xml
sed -i '' 's|FRESATITAN OPS|FRESATITAN OPS TV|g' android/app/src/main/res/values/strings.xml
# capacitor.config.ts
sed -i '' "s|appId: 'com.fresatitan.ops'|appId: 'com.fresatitan.ops.tv'|" capacitor.config.ts
sed -i '' "s|appName: 'FRESATITAN OPS'|appName: 'FRESATITAN OPS TV'|" capacitor.config.ts

# 4. Sync + build
echo "[3/4] Capacitor sync..."
npx cap sync android >/dev/null
echo "[4/4] Gradle assembleDebug..."
(cd android && ./gradlew clean assembleDebug -q)

# 5. Copiar APK al destino
OUT_DIR="builds/apk-tv"
mkdir -p "$OUT_DIR"
NEXT=$(printf "%03d" "$(( $(ls "$OUT_DIR" 2>/dev/null | grep -E '^[0-9]+$' | sort -n | tail -1 | sed 's/^0*//' | sed 's/^$/0/') + 1 ))")
DEST="$OUT_DIR/$NEXT"
mkdir -p "$DEST"
cp /tmp/fresatitan-android-build/app/outputs/apk/debug/app-debug.apk \
   "$DEST/FRESATITAN-OPS-TV-v${VERSION}-debug.apk"
cp "$DEST/FRESATITAN-OPS-TV-v${VERSION}-debug.apk" "$HOME/Downloads/"

echo ""
echo "[OK] APK TV generada:"
echo "  $DEST/FRESATITAN-OPS-TV-v${VERSION}-debug.apk"
echo "  $HOME/Downloads/FRESATITAN-OPS-TV-v${VERSION}-debug.apk"
