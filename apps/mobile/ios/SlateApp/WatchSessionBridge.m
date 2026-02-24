#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WatchSessionBridge, NSObject)

RCT_EXTERN_METHOD(syncToken:(NSString *)sessionJSON
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(clearToken:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup {
  return NO;
}

@end
