#!/bin/bash
# Convenience script to run the mobile app on Android emulator/device
# Usage:
#   ./run-android.sh              # Full run (emulator + metro + install)
#   ./run-android.sh --build      # Only build APK
#   ./run-android.sh --metro      # Only start Metro bundler
#   ./run-android.sh --reverse    # Only setup adb reverse proxy
#   ./run-android.sh --install    # Only install APK + setup reverse + launch

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Ensure env vars are set
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export JAVA_HOME="${JAVA_HOME:-/Library/Java/JavaVirtualMachines/jdk-20.jdk/Contents/Home}"

echo "🔧 ANDROID_HOME=$ANDROID_HOME"
echo "🔧 JAVA_HOME=$JAVA_HOME"

ADB="$ANDROID_HOME/platform-tools/adb"

setup_reverse() {
  echo "🔁 Setting up adb reverse proxy (emulator → host:3000)..."
  "$ADB" reverse --remove tcp:3000 2>/dev/null || true
  "$ADB" reverse tcp:3000 tcp:3000
  echo "✅ adb reverse: $("$ADB" reverse --list)"
}

start_emulator() {
  echo "📱 Checking for running emulator..."
  DEVICE=$("$ADB" devices | grep -v "List" | grep "device$" | head -1)
  if [ -z "$DEVICE" ]; then
    echo "📱 No device found. Starting emulator..."
    AVD=$("$ANDROID_HOME/emulator/emulator" -list-avds | head -1)
    if [ -z "$AVD" ]; then
      echo "❌ No AVD found. Create one with:"
      echo "   $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n Pixel_34 -k 'system-images;android-34;google_apis;arm64-v8a' -d pixel_3a"
      exit 1
    fi
    echo "📱 Starting AVD: $AVD"
    "$ANDROID_HOME/emulator/emulator" -avd "$AVD" -no-snapshot -netdelay none -no-boot-anim -gpu host &
    echo "⏳ Waiting for emulator to boot..."
    "$ADB" wait-for-device
    # Wait for boot to complete
    for i in $(seq 1 30); do
      BOOT=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')
      [ "$BOOT" = "1" ] && break
      sleep 3
    done
    echo "✅ Emulator ready"
  else
    echo "✅ Device/emulator already connected"
  fi
}

case "${1:-}" in
  --build)
    echo "🏗️  Building APK..."
    cd android
    ./gradlew assembleDebug
    echo "✅ APK built: android/app/build/outputs/apk/debug/app-debug.apk"
    ;;
  --metro)
    echo "📦 Starting Metro bundler..."
    npx react-native start
    ;;
  --reverse)
    setup_reverse
    ;;
  --install)
    setup_reverse
    echo "📲 Installing APK..."
    "$ADB" install -r android/app/build/outputs/apk/debug/app-debug.apk
    echo "🚀 Launching app..."
    "$ADB" shell am start -n com.payment.checkout/com.payment.checkout.MainActivity
    echo "✅ App launched! Close this terminal to stop."
    echo "   Or press Ctrl+C to return to shell."
    ;;
  *)
    echo "🚀 Full run: building + installing + starting Metro..."
    start_emulator
    setup_reverse
    cd android
    ./gradlew assembleDebug
    cd ..
    echo "📲 Installing APK..."
    "$ADB" install -r android/app/build/outputs/apk/debug/app-debug.apk
    echo "🚀 Launching app..."
    "$ADB" shell am start -n com.payment.checkout/com.payment.checkout.MainActivity
    echo "📦 Starting Metro bundler (for hot-reload)..."
    npx react-native start
    ;;
esac
