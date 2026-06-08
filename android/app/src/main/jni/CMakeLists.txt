cmake_minimum_required(VERSION 3.13)

# Required for New Architecture: registers TurboModules (PlatformConstants, etc.)
project(appmodules)
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# DVR SDK audio encoder bridge (loaded separately via System.loadLibrary)
add_library(dvr_sdk_audio_bridge SHARED ../cpp/dvr_sdk_audio_bridge.cpp)
target_link_libraries(dvr_sdk_audio_bridge dl log)
