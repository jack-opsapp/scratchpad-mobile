//
//  SLATE_WIDGETBundle.swift
//  SLATE-WIDGET
//
//  Widget bundle entry point. Only includes the voice input control.
//

import WidgetKit
import SwiftUI

@main
struct SLATE_WIDGETBundle: WidgetBundle {
    var body: some Widget {
        SLATE_WIDGETControl()
    }
}
