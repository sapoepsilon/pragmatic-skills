#!/bin/bash
# Frame a screen recording on a background (Screen-Studio-style) with optional
# crop-to-app and zoom segments. Pure ffmpeg — no GUI tools.
#
#   render.sh IN OUT [options]
#     --rect x,y,w,h          crop region in PIXELS before framing
#     --rect-json FILE        output of record.sh rect (points; auto-scaled to pixels)
#     --bg VALUE              '#0b1220' | /path/wallpaper.jpg | 'gradient' (default)
#     --pad PCT               margin: content fills (100-2*PCT)% of width (default 8)
#     --radius PX             rounded corners on content, 0=off (default 24)
#     --zoom t,dur,x,y,scale  zoom segment (repeatable, max 4; x,y in content pixels
#                             AFTER crop; scale e.g. 1.8; 0.5s ease in/out inside dur)
#     --size WxH              output size (default: input size, even-aligned)
#     --fps N                 output fps (default 30)
set -euo pipefail

IN="${1:?usage: render.sh IN OUT [options]}"; OUT="${2:?missing OUT}"; shift 2
RECT="" RECT_JSON="" BG="gradient" PAD=8 RADIUS=24 SIZE="" FPS=30
ZOOMS=()
while [ $# -gt 0 ]; do case "$1" in
  --rect) RECT="$2"; shift 2 ;;
  --rect-json) RECT_JSON="$2"; shift 2 ;;
  --bg) BG="$2"; shift 2 ;;
  --pad) PAD="$2"; shift 2 ;;
  --radius) RADIUS="$2"; shift 2 ;;
  --zoom) ZOOMS+=("$2"); shift 2 ;;
  --size) SIZE="$2"; shift 2 ;;
  --fps) FPS="$2"; shift 2 ;;
  *) echo "unknown option $1" >&2; exit 1 ;;
esac; done

IFS=, read -r IW IH <<<"$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$IN")"
DUR="$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")"
if [ -n "$SIZE" ]; then OW="${SIZE%x*}"; OH="${SIZE#*x}"; else OW=$IW; OH=$IH; fi
OW=$((OW / 2 * 2)); OH=$((OH / 2 * 2))

if [ -n "$RECT_JSON" ]; then
  RECT="$(python3 - "$RECT_JSON" "$IW" <<'PY'
import json,sys
d=json.load(open(sys.argv[1])); iw=int(sys.argv[2])
x,y,w,h=d["rect"]; dw=d["desktop"][0]
s=iw/dw  # points -> pixels (retina)
print(f"{int(x*s)},{int(y*s)},{int(w*s)//2*2},{int(h*s)//2*2}")
PY
)"
fi

CROP=""
CW=$IW; CH=$IH
if [ -n "$RECT" ]; then
  IFS=, read -r CX CY CW CH <<<"$RECT"
  CROP="crop=${CW}:${CH}:${CX}:${CY},"
fi

# content size: keep AR, fit (100-2*PAD)% of output width
TW=$(python3 -c "print(int($OW*(100-2*$PAD)/100)//2*2)")
TH=$(python3 -c "print(min(int($TW*$CH/$CW)//2*2, int($OH*(100-2*$PAD)/100)//2*2))")
TW=$(python3 -c "print(int($TH*$CW/$CH)//2*2)")

# background input
case "$BG" in
  gradient) BGIN=(-f lavfi -i "gradients=s=${OW}x${OH}:c0=#0e1726:c1=#1f3b5c:x0=0:y0=0:x1=${OW}:y1=${OH}:d=3600") ;;
  \#*)      BGIN=(-f lavfi -i "color=c=${BG}:s=${OW}x${OH}") ;;
  *)        BGIN=(-loop 1 -i "$BG") ;;
esac
BGF="[1:v]scale=${OW}:${OH}:force_original_aspect_ratio=increase,crop=${OW}:${OH},setsar=1[bg]"

# content chain (+ optional rounded-corner mask computed once, then looped)
FC="[0:v]${CROP}scale=${TW}:${TH},setsar=1,fps=${FPS}[cnt0]"
if [ "$RADIUS" -gt 0 ] 2>/dev/null; then
  FC="$FC;color=c=white:s=${TW}x${TH}:d=1,format=gray,geq=lum='if(gt(abs(W/2-X),W/2-${RADIUS})*gt(abs(H/2-Y),H/2-${RADIUS}),if(lte(hypot(${RADIUS}-(W/2-abs(W/2-X)),${RADIUS}-(H/2-abs(H/2-Y))),${RADIUS}),255,0),255)',loop=-1:size=1[mask];[cnt0][mask]alphamerge[cnt]"
  OVFMT="format=auto"
else
  FC="$FC;[cnt0]null[cnt]"
  OVFMT="format=auto"
fi
FC="${BGF};${FC};[bg][cnt]overlay=(W-w)/2:(H-h)/2:${OVFMT}[comp0];[comp0]trim=duration=${DUR},setpts=PTS-STARTPTS[comp]"

# zoom segments on the composited frame
LAST="comp"
if [ ${#ZOOMS[@]} -gt 0 ]; then
  SEGS=(); T0=0; i=0
  for Z in "${ZOOMS[@]}"; do
    IFS=, read -r ZT ZD ZX ZY ZS <<<"$Z"
    # map content coords -> comp coords
    ZXC=$(python3 -c "print(int(($OW-$TW)/2 + $ZX*$TW/$CW))")
    ZYC=$(python3 -c "print(int(($OH-$TH)/2 + $ZY*$TH/$CH))")
    E=$(python3 -c "print(min(0.5,$ZD/4))")
    EF=$(python3 -c "print(max(1,int($E*$FPS)))")
    DF=$(python3 -c "print(max(2,int($ZD*$FPS)))")
    FC="$FC;[$LAST]split=2[a$i][b$i]"
    FC="$FC;[a$i]trim=${T0}:${ZT},setpts=PTS-STARTPTS[pre$i]"
    FC="$FC;[b$i]split=2[c$i][d$i]"
    ZEXPR="if(lt(in,${EF}),1+(${ZS}-1)*in/${EF},if(lt(in,${DF}-${EF}),${ZS},max(1,${ZS}-(${ZS}-1)*(in-(${DF}-${EF}))/${EF})))"
    FC="$FC;[c$i]trim=${ZT}:$(python3 -c "print($ZT+$ZD)"),setpts=PTS-STARTPTS,zoompan=d=1:fps=${FPS}:s=${OW}x${OH}:z='${ZEXPR}':x='min(max(${ZXC}-(iw/zoom)/2,0),iw-iw/zoom)':y='min(max(${ZYC}-(ih/zoom)/2,0),ih-ih/zoom)'[zoom$i]"
    FC="$FC;[d$i]trim=start=$(python3 -c "print($ZT+$ZD)"),setpts=PTS-STARTPTS[rest$i]"
    SEGS+=("[pre$i][zoom$i]"); LAST="rest$i"; T0=0; i=$((i+1))
  done
  CONCAT=""; N=0
  for s in "${SEGS[@]}"; do CONCAT+="$s"; N=$((N+2)); done
  CONCAT+="[$LAST]"; N=$((N+1))
  FC="$FC;${CONCAT}concat=n=${N}:v=1:a=0[outv]"
  LAST="outv"
fi

ffmpeg -y -loglevel error -i "$IN" "${BGIN[@]}" \
  -filter_complex "$FC" -map "[$LAST]" \
  -r "$FPS" -c:v libx264 -pix_fmt yuv420p -crf 20 -movflags +faststart "$OUT"
echo "$OUT"
