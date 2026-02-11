import subprocess
import os

try:
    import imageio_ffmpeg
    ffmpeg_path = imageio_ffmpeg.get_ffmpeg_exe()
except ImportError:
    print("imageio-ffmpeg not installed")
    exit(1)

base = os.path.dirname(os.path.abspath(__file__))
input_video = os.path.join(base, 'web-app', 'dist', 'traffic_out.mp4')
output_video = os.path.join(base, 'web-app', 'public', 'traffic_dashboard.mp4')

# Remove old corrupted file
if os.path.exists(output_video):
    os.remove(output_video)

print(f"Source: {input_video}")
print(f"Exists: {os.path.exists(input_video)}")

# Cut 10 seconds and encode to H.264 in one step
result = subprocess.run(
    [
        ffmpeg_path,
        '-i', input_video,
        '-t', '10',
        '-c:v', 'libx264',
        '-crf', '23',
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        '-an',
        '-y',
        output_video
    ],
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"Error:\n{result.stderr[-500:]}")
else:
    size_mb = os.path.getsize(output_video) / (1024*1024)
    print(f"Success! {output_video} ({size_mb:.1f} MB)")
