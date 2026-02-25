#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(VoiceInputBridge, NSObject)

RCT_EXTERN_METHOD(checkPendingVoiceInput:
                  (RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
