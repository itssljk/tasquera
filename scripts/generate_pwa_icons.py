import os
from PIL import Image, ImageDraw

def draw_icon(size, corner_radius, is_maskable=False):
    # Render at 4x for high quality anti-aliasing
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    bg_color = (40, 112, 78, 255)       # #28704E
    fg_color = (251, 249, 245, 255)     # #FBF9F5
    
    if is_maskable:
        # Solid square fill (no rounded corners for maskable)
        draw.rectangle([0, 0, s, s], fill=bg_color)
        # Checkmark scaled to safe center area (~60% of size)
        padding = s * 0.2
        c_width = s * 0.6
        p1 = (padding + c_width * (9.5 / 32), padding + c_width * (17.0 / 32))
        p2 = (padding + c_width * (14.0 / 32), padding + c_width * (21.5 / 32))
        p3 = (padding + c_width * (23.0 / 32), padding + c_width * (11.5 / 32))
        stroke = int(c_width * (3.4 / 32))
    else:
        # Rounded rectangle background
        r = corner_radius * scale
        draw.rounded_rectangle([0, 0, s, s], radius=r, fill=bg_color)
        # Standard checkmark
        p1 = (s * (9.5 / 32.0), s * (17.0 / 32.0))
        p2 = (s * (14.0 / 32.0), s * (21.5 / 32.0))
        p3 = (s * (23.0 / 32.0), s * (11.5 / 32.0))
        stroke = int(s * (3.4 / 32.0))
    
    # Draw thick line segments
    draw.line([p1, p2], fill=fg_color, width=stroke)
    draw.line([p2, p3], fill=fg_color, width=stroke)
    # Draw smooth round caps and joint circle at all 3 points (p1, p2, p3)
    cap_r = stroke / 2.0
    for pt in [p1, p2, p3]:
        draw.ellipse([pt[0] - cap_r, pt[1] - cap_r, pt[0] + cap_r, pt[1] + cap_r], fill=fg_color)
        
    # Resize down with Lanczos resampling
    return img.resize((size, size), Image.Resampling.LANCZOS)

output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")

icon_192 = draw_icon(192, corner_radius=54)
icon_192.save(os.path.join(output_dir, "pwa-192x192.png"))

icon_512 = draw_icon(512, corner_radius=144)
icon_512.save(os.path.join(output_dir, "pwa-512x512.png"))

apple_icon = draw_icon(180, corner_radius=40)
apple_icon.save(os.path.join(output_dir, "apple-touch-icon.png"))

maskable_512 = draw_icon(512, corner_radius=0, is_maskable=True)
maskable_512.save(os.path.join(output_dir, "maskable-icon-512x512.png"))

print("PWA Icons generated successfully!")
