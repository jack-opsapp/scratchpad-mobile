import SwiftUI

struct NoteRowView: View {
    let note: SlateNote
    let onToggle: () -> Void

    private let accent = Color(hex: "948b72")

    var body: some View {
        Button(action: onToggle) {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: (note.isCompleted ?? false) ? "checkmark.circle.fill" : "circle")
                    .font(.body)
                    .foregroundColor((note.isCompleted ?? false) ? accent : .secondary)

                Text(note.content ?? "")
                    .font(.caption2)
                    .strikethrough(note.isCompleted ?? false)
                    .foregroundColor((note.isCompleted ?? false) ? .secondary : .primary)
                    .lineLimit(3)

                Spacer()
            }
        }
        .buttonStyle(.plain)
    }
}
