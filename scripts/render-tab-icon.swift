import AppKit
import Foundation

guard CommandLine.arguments.count == 4 else {
  fputs("用法：render-tab-icon <input.svg> <output.png> <stroke-color>\n", stderr)
  exit(1)
}

let inputPath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let strokeColor = CommandLine.arguments[3]
let source = try String(contentsOfFile: inputPath, encoding: .utf8)
  .replacingOccurrences(of: "currentColor", with: strokeColor)

guard
  let image = NSImage(data: Data(source.utf8)),
  let bitmap = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: 64,
    pixelsHigh: 64,
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ),
  let context = NSGraphicsContext(bitmapImageRep: bitmap)
else {
  throw NSError(domain: "TabIconRenderer", code: 1)
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.imageInterpolation = .high
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: 64, height: 64).fill()
image.draw(
  in: NSRect(x: 8, y: 8, width: 48, height: 48),
  from: NSRect(origin: .zero, size: image.size),
  operation: .sourceOver,
  fraction: 1
)
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
  throw NSError(domain: "TabIconRenderer", code: 2)
}
try png.write(to: URL(fileURLWithPath: outputPath))
