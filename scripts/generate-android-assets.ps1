Add-Type -AssemblyName System.Drawing

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$resDir = "$projectRoot\android\app\src\main\res"
$pwaIconPath = "$projectRoot\public\pwa-512x512.png"
$maskableIconPath = "$projectRoot\public\maskable-icon-512x512.png"

# Load source images
$pwaImg = [System.Drawing.Image]::FromFile($pwaIconPath)
$maskableImg = [System.Drawing.Image]::FromFile($maskableIconPath)

# Function to resize image with high quality
function Resize-Image($srcImg, $width, $height, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($srcImg, 0, 0, $width, $height)
    $g.Dispose()
    
    $dir = Split-Path $outPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $outPath ($width x $height)"
}

# Function to generate circular round icon
function Create-Round-Icon($srcImg, $size, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($srcImg, 0, 0, $size, $size)
    $g.Dispose()
    $path.Dispose()
    
    $dir = Split-Path $outPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Round: $outPath ($size x $size)"
}

# Function to generate adaptive foreground (white checkmark centered on transparent canvas)
function Create-Adaptive-Foreground($srcMaskable, $canvasSize, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($canvasSize, $canvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Checkmark path in 108x108 coords scaled to $canvasSize
    # SVG viewBox was 32x32: checkmark path from (9.5,17) to (14,21.5) to (23,11.5), stroke-width 3.4
    # Let's draw the smooth anti-aliased checkmark line
    $scale = $canvasSize / 108.0
    
    # Points scaled
    $p1 = New-Object System.Drawing.PointF((43.03 * $scale), (55.69 * $scale))
    $p2 = New-Object System.Drawing.PointF((50.625 * $scale), (63.28 * $scale))
    $p3 = New-Object System.Drawing.PointF((65.81 * $scale), (46.41 * $scale))
    
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 251, 249, 245), (5.8 * $scale))
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddLine($p1, $p2)
    $path.AddLine($p2, $p3)
    $g.DrawPath($pen, $path)
    
    $pen.Dispose()
    $path.Dispose()
    $g.Dispose()
    
    $dir = Split-Path $outPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Foreground: $outPath ($canvasSize x $canvasSize)"
}

# Function to generate Splash Screen (Tasquera theme #131211 with centered icon)
function Create-Splash($width, $height, $srcIcon, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    # Background color #131211
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0x13, 0x12, 0x11))
    $g.FillRectangle($brush, 0, 0, $width, $height)
    $brush.Dispose()
    
    # Draw centered icon (e.g. 25% of min dimension, min 96px, max 256px)
    $iconSize = [int][Math]::Max(96, [Math]::Min(256, [Math]::Min($width, $height) * 0.28))
    $x = [int](($width - $iconSize) / 2)
    $y = [int](($height - $iconSize) / 2)
    $g.DrawImage($srcIcon, $x, $y, $iconSize, $iconSize)
    
    $g.Dispose()
    $dir = Split-Path $outPath
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Splash: $outPath ($width x $height)"
}

# 1. Launcher Mipmap icons
$densities = @(
    @{ name = "mdpi"; launcherSize = 48; fgSize = 108 },
    @{ name = "hdpi"; launcherSize = 72; fgSize = 162 },
    @{ name = "xhdpi"; launcherSize = 96; fgSize = 216 },
    @{ name = "xxhdpi"; launcherSize = 144; fgSize = 324 },
    @{ name = "xxxhdpi"; launcherSize = 192; fgSize = 432 }
)

foreach ($d in $densities) {
    $folder = "$resDir\mipmap-$($d.name)"
    Resize-Image $pwaImg $d.launcherSize $d.launcherSize "$folder\ic_launcher.png"
    Create-Round-Icon $maskableImg $d.launcherSize "$folder\ic_launcher_round.png"
    Create-Adaptive-Foreground $maskableImg $d.fgSize "$folder\ic_launcher_foreground.png"
}

# 2. Splash screens (Port and Land)
$splashes = @(
    @{ path = "$resDir\drawable\splash.png"; w = 480; h = 800 },
    @{ path = "$resDir\drawable-port-mdpi\splash.png"; w = 320; h = 480 },
    @{ path = "$resDir\drawable-port-hdpi\splash.png"; w = 480; h = 800 },
    @{ path = "$resDir\drawable-port-xhdpi\splash.png"; w = 720; h = 1280 },
    @{ path = "$resDir\drawable-port-xxhdpi\splash.png"; w = 960; h = 1600 },
    @{ path = "$resDir\drawable-port-xxxhdpi\splash.png"; w = 1280; h = 1920 },
    @{ path = "$resDir\drawable-land-mdpi\splash.png"; w = 480; h = 320 },
    @{ path = "$resDir\drawable-land-hdpi\splash.png"; w = 800; h = 480 },
    @{ path = "$resDir\drawable-land-xhdpi\splash.png"; w = 1280; h = 720 },
    @{ path = "$resDir\drawable-land-xxhdpi\splash.png"; w = 1600; h = 960 },
    @{ path = "$resDir\drawable-land-xxxhdpi\splash.png"; w = 1920; h = 1280 }
)

foreach ($s in $splashes) {
    Create-Splash $s.w $s.h $pwaImg $s.path
}

$pwaImg.Dispose()
$maskableImg.Dispose()
Write-Host "All Android Icons and Splash screens successfully generated!"
