//
//  SLATE_WIDGETLiveActivity.swift
//  SLATE-WIDGET
//
//  Created by Jackson Sweet on 2026-02-24.
//

import ActivityKit
import WidgetKit
import SwiftUI

struct SLATE_WIDGETAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

struct SLATE_WIDGETLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: SLATE_WIDGETAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Text("Hello \(context.state.emoji)")
            }
            .activityBackgroundTint(Color.cyan)
            .activitySystemActionForegroundColor(Color.black)

        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom \(context.state.emoji)")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T \(context.state.emoji)")
            } minimal: {
                Text(context.state.emoji)
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

extension SLATE_WIDGETAttributes {
    fileprivate static var preview: SLATE_WIDGETAttributes {
        SLATE_WIDGETAttributes(name: "World")
    }
}

extension SLATE_WIDGETAttributes.ContentState {
    fileprivate static var smiley: SLATE_WIDGETAttributes.ContentState {
        SLATE_WIDGETAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: SLATE_WIDGETAttributes.ContentState {
         SLATE_WIDGETAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: SLATE_WIDGETAttributes.preview) {
   SLATE_WIDGETLiveActivity()
} contentStates: {
    SLATE_WIDGETAttributes.ContentState.smiley
    SLATE_WIDGETAttributes.ContentState.starEyes
}
