#!/bin/bash
# =============================================================================
# NumbahWan Media Utilities
# Smooth batch download & compress for images, icons, audio, etc.
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default settings
DEFAULT_QUALITY=80
DEFAULT_SIZE=512
WEBP_QUALITY=80
ICON_SIZE=64

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    cat << 'EOF'
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        NumbahWan Media Utilities                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝

USAGE:
  media-utils.sh <command> [options]

COMMANDS:
  compress-images <input_dir> <output_dir> [size] [quality]
      Convert all images to WebP with optional resize
      Default: 512px, quality 80

  compress-icons <input_dir> <output_dir> [size]
      Optimize icons to small WebP (default 64px)

  compress-audio <input_dir> <output_dir> [bitrate]
      Convert audio to MP3/OGG with optional bitrate (default 128k)

  batch-rename <dir> <prefix>
      Rename files with numbered prefix (01-name, 02-name, etc.)

  show-savings <dir>
      Show compression savings report

EXAMPLES:
  # Compress all images in a folder to WebP
  ./media-utils.sh compress-images ./raw-images ./public/static/art 512 80

  # Compress icons to 64px WebP
  ./media-utils.sh compress-icons ./raw-icons ./public/static/icons 64

  # Convert audio files
  ./media-utils.sh compress-audio ./raw-audio ./public/static/audio 128k

  # Batch rename with prefix
  ./media-utils.sh batch-rename ./images stock

EOF
}

# =============================================================================
# COMPRESS IMAGES TO WEBP
# =============================================================================
compress_images() {
    local input_dir="$1"
    local output_dir="$2"
    local size="${3:-$DEFAULT_SIZE}"
    local quality="${4:-$DEFAULT_QUALITY}"

    if [[ -z "$input_dir" || -z "$output_dir" ]]; then
        log_error "Usage: compress-images <input_dir> <output_dir> [size] [quality]"
        exit 1
    fi

    mkdir -p "$output_dir"

    log_info "Compressing images: $input_dir → $output_dir"
    log_info "Settings: ${size}px, quality ${quality}"

    local count=0
    local total_before=0
    local total_after=0

    # Find all image files
    find "$input_dir" -maxdepth 1 -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.webp" \) | while read -r img; do
        local basename=$(basename "$img")
        local name="${basename%.*}"
        local output="$output_dir/${name}.webp"
        
        convert "$img" -resize "${size}x${size}" -quality "$quality" "$output" 2>/dev/null || true
        
        count=$((count + 1))
        echo -ne "\r  Processing: $count files..."
    done

    echo ""
    
    # Count results
    local final_count=$(find "$output_dir" -maxdepth 1 -name "*.webp" | wc -l)
    
    if [[ $final_count -eq 0 ]]; then
        log_warn "No images found in $input_dir"
        return
    fi

    # Calculate sizes
    local before_size=$(du -sb "$input_dir" 2>/dev/null | cut -f1 || echo 0)
    local after_size=$(du -sb "$output_dir" 2>/dev/null | cut -f1 || echo 0)
    
    log_success "Compressed $final_count images"
    log_success "Output directory: $output_dir"
}

# =============================================================================
# COMPRESS ICONS (SMALL WEBP)
# =============================================================================
compress_icons() {
    local input_dir="$1"
    local output_dir="$2"
    local size="${3:-$ICON_SIZE}"

    compress_images "$input_dir" "$output_dir" "$size" 85
}

# =============================================================================
# COMPRESS AUDIO
# =============================================================================
compress_audio() {
    local input_dir="$1"
    local output_dir="$2"
    local bitrate="${3:-128k}"
    local format="${4:-mp3}"

    if [[ -z "$input_dir" || -z "$output_dir" ]]; then
        log_error "Usage: compress-audio <input_dir> <output_dir> [bitrate] [format]"
        exit 1
    fi

    mkdir -p "$output_dir"

    log_info "Compressing audio: $input_dir → $output_dir"
    log_info "Settings: ${bitrate}, format ${format}"

    local count=0

    find "$input_dir" -maxdepth 1 -type f \( -iname "*.mp3" -o -iname "*.wav" -o -iname "*.ogg" -o -iname "*.m4a" -o -iname "*.flac" \) | while read -r audio; do
        local basename=$(basename "$audio")
        local name="${basename%.*}"
        local output="$output_dir/${name}.${format}"
        
        ffmpeg -i "$audio" -b:a "$bitrate" -y "$output" 2>/dev/null || true
        
        count=$((count + 1))
        echo -ne "\r  Processing: $count files..."
    done

    echo ""
    
    local final_count=$(find "$output_dir" -maxdepth 1 -name "*.${format}" | wc -l)
    
    if [[ $final_count -eq 0 ]]; then
        log_warn "No audio files found in $input_dir"
        return
    fi

    log_success "Compressed $final_count audio files"
}

# =============================================================================
# BATCH RENAME WITH PREFIX
# =============================================================================
batch_rename() {
    local dir="$1"
    local prefix="$2"

    if [[ -z "$dir" || -z "$prefix" ]]; then
        log_error "Usage: batch-rename <dir> <prefix>"
        exit 1
    fi

    log_info "Renaming files in $dir with prefix '$prefix'"

    local count=1
    for file in "$dir"/*; do
        [[ -f "$file" ]] || continue
        
        local ext="${file##*.}"
        local newname=$(printf "%s/%02d-%s.%s" "$dir" "$count" "$prefix" "$ext")
        
        mv "$file" "$newname"
        count=$((count + 1))
    done

    log_success "Renamed $((count - 1)) files"
}

# =============================================================================
# SHOW COMPRESSION SAVINGS
# =============================================================================
show_savings() {
    local dir="$1"

    if [[ -z "$dir" ]]; then
        log_error "Usage: show-savings <dir>"
        exit 1
    fi

    log_info "Analyzing $dir..."

    local total=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo 0)
    local count=$(find "$dir" -maxdepth 1 -type f | wc -l)

    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║         Directory Analysis            ║"
    echo "╠═══════════════════════════════════════╣"
    printf "║  Files:      %-24s ║\n" "$count"
    printf "║  Total Size: %-24s ║\n" "$(numfmt --to=iec $total 2>/dev/null || echo "$total bytes")"
    if [[ $count -gt 0 ]]; then
        printf "║  Avg Size:   %-24s ║\n" "$(numfmt --to=iec $((total / count)) 2>/dev/null || echo "$((total / count)) bytes")"
    fi
    echo "╚═══════════════════════════════════════╝"
}

# =============================================================================
# MAIN
# =============================================================================
case "${1:-help}" in
    compress-images)
        shift
        compress_images "$@"
        ;;
    compress-icons)
        shift
        compress_icons "$@"
        ;;
    compress-audio)
        shift
        compress_audio "$@"
        ;;
    batch-rename)
        shift
        batch_rename "$@"
        ;;
    show-savings)
        shift
        show_savings "$@"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
