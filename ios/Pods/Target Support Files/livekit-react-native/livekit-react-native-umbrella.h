#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "LivekitReactNative.h"
#import "LKAudioProcessingAdapter.h"
#import "LKAudioProcessingManager.h"

FOUNDATION_EXPORT double livekit_react_nativeVersionNumber;
FOUNDATION_EXPORT const unsigned char livekit_react_nativeVersionString[];

