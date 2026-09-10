"""Generate a 1024x1024 PITWALL icon PNG (no third-party deps)."""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

SIZE = 1024
OUT = Path(__file__).parent / "icon-source.png"


def in_mark(x: int, y: int) -> bool:
    # polygon: (0.22,0.19) (0.78,0.19) (0.78,0.59) (0.59,0.81) (0.22,0.81)
    nx, ny = x / SIZE, y / SIZE
    if nx < 0.22 or nx > 0.78 or ny < 0.19 or ny > 0.81:
        return False
    # right notch: from (0.78,0.59) to (0.59,0.81)
    if nx > 0.59 and ny > 0.59:
        t = (ny - 0.59) / (0.81 - 0.59)
        edge = 0.78 - t * (0.78 - 0.59)
        return nx <= edge
    return True


def png(width: int, height: int, pixels: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = bytearray()
    row = width * 4
    for y in range(height):
        raw.append(0)
        raw.extend(pixels[y * row : (y + 1) * row])
    return b"".join(
        [
            b"\x89PNG\r\n\x1a\n",
            chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)),
            chunk(b"IDAT", zlib.compress(bytes(raw), 9)),
            chunk(b"IEND", b""),
        ]
    )


def main() -> None:
    pixels = bytearray()
    for y in range(SIZE):
        for x in range(SIZE):
            if in_mark(x, y):
                pixels.extend(b"\xc4\x45\x3c\xff")
            else:
                pixels.extend(b"\x07\x08\x0b\xff")
    OUT.write_bytes(png(SIZE, SIZE, bytes(pixels)))
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
