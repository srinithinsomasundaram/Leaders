import * as React from "react";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  Share2,
  Download,
  Copy,
  Check,
  Send,
  Linkedin,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";

export type SharePostData = {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags?: string[];
  ai_summary?: string | null;
  profiles: {
    username: string;
    name: string;
    profession?: string | null;
    avatar_url?: string | null;
    is_verified?: boolean;
  } | null;
  categories?: {
    name: string;
    slug: string;
  } | null;
};

interface SharePostDialogProps {
  post: SharePostData;
  trigger?: React.ReactNode;
}

export function SharePostDialog({ post, trigger }: SharePostDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [shareUrl, setShareUrl] = useState("");
  const [displayHost, setDisplayHost] = useState("yespleaders.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(`${window.location.origin}/post/${post.slug}`);
      setDisplayHost(window.location.host || "yespleaders.com");
    }
  }, [post.slug]);

  const authorName = post.profiles?.name || "Anonymous";
  const authorProfession = post.profiles?.profession || "";
  const isVerified = post.profiles?.is_verified || false;
  const categoryName = post.categories?.name || "Insight";
  const previewText = post.ai_summary || post.content.slice(0, 150) + "...";

  // Formatted share text
  const shareText = `Check out this insight on Yesp Leaders: "${post.title}" by ${authorName}\n\n${shareUrl}`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const shareToX = () => {
    window.open(`https://x.com/intent/post?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareToLinkedIn = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareToWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  // Helper to load image with CORS support
  const loadImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const drawVerifiedBadge = (ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    const scale = size / 24;
    ctx.scale(scale, scale);

    // Draw Starburst
    const path = new Path2D(
      "M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.48 0-.94.1-1.348.27C14.825 2.515 13.512 1.5 12 1.5s-2.825 1.015-3.422 2.28c-.407-.17-.867-.27-1.348-.27-2.108 0-3.818 1.78-3.818 3.99 0 .495.084.965.238 1.4-1.273.65-2.148 2.02-2.148 3.6 0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.48 0 .94-.1 1.348-.27.597 1.265 1.91 2.28 3.422 2.28s2.825-1.015 3.422-2.28c.407.17.867.27 1.348.27 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z"
    );

    const grad = ctx.createLinearGradient(0, 24, 24, 0);
    grad.addColorStop(0, "#9A7B1C");
    grad.addColorStop(0.15, "#E6C762");
    grad.addColorStop(0.35, "#FFF4C2");
    grad.addColorStop(0.55, "#C89D2D");
    grad.addColorStop(0.75, "#F7E28B");
    grad.addColorStop(1, "#8A6614");

    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(80, 53, 5, 0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fill(path);

    const bevelGrad = ctx.createLinearGradient(0, 0, 24, 24);
    bevelGrad.addColorStop(0, "rgba(255, 255, 255, 0.6)");
    bevelGrad.addColorStop(0.3, "rgba(255, 255, 255, 0.1)");
    bevelGrad.addColorStop(0.7, "rgba(122, 88, 16, 0.15)");
    bevelGrad.addColorStop(1, "rgba(80, 53, 5, 0.45)");

    ctx.strokeStyle = bevelGrad;
    ctx.lineWidth = 0.8;
    ctx.shadowColor = "transparent";
    ctx.stroke(path);

    ctx.beginPath();
    ctx.moveTo(8.2, 12.2);
    ctx.lineTo(10.8, 14.8);
    ctx.lineTo(16, 9.6);
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();

    ctx.restore();
  };

  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    maxLines: number = 99
  ): number => {
    const words = text.split(" ");
    let line = "";
    let linesCount = 0;
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
        linesCount++;
        if (linesCount >= maxLines - 1 && n < words.length - 1) {
          ctx.fillText(line.trim() + "...", x, currentY);
          return currentY + lineHeight;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
    return currentY + lineHeight;
  };

  const generateImage = async () => {
    if (!canvasRef.current) return;
    setGenerating(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setGenerating(false);
      return;
    }

    try {
      const width = 1080;
      const height = 1080;
      canvas.width = width;
      canvas.height = height;

      // Draw Background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "#0C0B0F");
      bgGrad.addColorStop(0.5, "#0E0E12");
      bgGrad.addColorStop(1, "#181523");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Radial mesh lights (indigo/gold)
      const rad1 = ctx.createRadialGradient(width, 0, 200, width, 0, 1000);
      rad1.addColorStop(0, "rgba(212, 175, 55, 0.15)");
      rad1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rad1;
      ctx.fillRect(0, 0, width, height);

      const rad2 = ctx.createRadialGradient(0, height, 200, 0, height, 1000);
      rad2.addColorStop(0, "rgba(99, 102, 241, 0.12)");
      rad2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rad2;
      ctx.fillRect(0, 0, width, height);

      // Card Container
      const padX = 70;
      const padY = 70;
      const cardW = width - padX * 2;
      const cardH = height - padY * 2;
      const radius = 48;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(padX, padY, cardW, cardH, radius);
      ctx.fillStyle = "rgba(18, 17, 24, 0.65)";
      ctx.fill();

      // Card border gradient
      const borderGrad = ctx.createLinearGradient(padX, padY, padX + cardW, padY + cardH);
      borderGrad.addColorStop(0, "rgba(212, 175, 55, 0.25)");
      borderGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
      borderGrad.addColorStop(1, "rgba(99, 102, 241, 0.2)");
      ctx.strokeStyle = borderGrad;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Load avatar image if it exists
      let avatarImg: HTMLImageElement | null = null;
      if (post.profiles?.avatar_url) {
        avatarImg = await loadImage(post.profiles.avatar_url);
      }

      // Render Profile Block
      const profX = padX + 60;
      const profY = padY + 70;
      const avatarSize = 110;

      ctx.save();
      ctx.beginPath();
      ctx.arc(profX + avatarSize / 2, profY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      if (avatarImg) {
        ctx.drawImage(avatarImg, profX, profY, avatarSize, avatarSize);
      } else {
        ctx.fillStyle = "#D4AF37";
        ctx.fillRect(profX, profY, avatarSize, avatarSize);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 48px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(authorName[0].toUpperCase(), profX + avatarSize / 2, profY + avatarSize / 2);
      }
      ctx.restore();

      // Draw avatar ring
      ctx.save();
      ctx.beginPath();
      ctx.arc(profX + avatarSize / 2, profY + avatarSize / 2, avatarSize / 2 + 1, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(212, 175, 55, 0.4)";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // Write Name & Profession
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = "bold 38px system-ui, sans-serif";
      
      const nameX = profX + avatarSize + 30;
      const nameY = profY + 15;
      ctx.fillText(authorName, nameX, nameY);

      // Measure name text to place verified badge
      const nameWidth = ctx.measureText(authorName).width;
      if (isVerified) {
        drawVerifiedBadge(ctx, nameX + nameWidth + 15, nameY + 5, 34);
      }

      // Profession
      if (authorProfession) {
        ctx.fillStyle = "#9CA3AF";
        ctx.font = "30px system-ui, sans-serif";
        ctx.fillText(authorProfession, nameX, nameY + 55);
      }

      // Render Category Pill
      const pillX = padX + cardW - 250;
      const pillY = profY + 20;
      const pillW = 190;
      const pillH = 60;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 12);
      ctx.fillStyle = "rgba(212, 175, 55, 0.15)";
      ctx.fill();
      ctx.strokeStyle = "rgba(212, 175, 55, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#FFF";
      ctx.font = "bold 22px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(categoryName.toUpperCase(), pillX + pillW / 2, pillY + pillH / 2);
      ctx.restore();

      // Render Main Post Title
      const contentX = padX + 60;
      const titleY = profY + avatarSize + 70;
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.font = "bold 56px Georgia, serif";

      const maxTextW = cardW - 120;
      const afterTitleY = wrapText(ctx, post.title, contentX, titleY, maxTextW, 72, 3);

      // Horizontal Divider
      const divY = afterTitleY + 20;
      const divGrad = ctx.createLinearGradient(contentX, divY, contentX + maxTextW, divY);
      divGrad.addColorStop(0, "rgba(212, 175, 55, 0.6)");
      divGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
      divGrad.addColorStop(1, "rgba(99, 102, 241, 0)");
      ctx.strokeStyle = divGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(contentX, divY);
      ctx.lineTo(contentX + maxTextW - 100, divY);
      ctx.stroke();

      // Render Post Excerpt / Summary
      ctx.fillStyle = "#E5E7EB";
      ctx.font = "34px system-ui, sans-serif";
      const descY = divY + 50;
      wrapText(ctx, previewText, contentX, descY, maxTextW, 52, 4);

      // Branding Footer at Card Bottom
      const footerY = padY + cardH - 120;
      const logoSize = 40;
      const logoY = footerY - 6;

      ctx.save();
      ctx.translate(contentX, logoY);
      // Background rounded rect
      ctx.beginPath();
      ctx.roundRect(0, 0, logoSize, logoSize, 8);
      ctx.fillStyle = "#111111";
      ctx.fill();
      // White peak polygon
      ctx.beginPath();
      ctx.moveTo(logoSize * (70/140), logoSize * (28/140));
      ctx.lineTo(logoSize * (22/140), logoSize * (124/140));
      ctx.lineTo(logoSize * (118/140), logoSize * (124/140));
      ctx.closePath();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      // Hollow cutout
      ctx.beginPath();
      ctx.moveTo(logoSize * (70/140), logoSize * (50/140));
      ctx.lineTo(logoSize * (42/140), logoSize * (124/140));
      ctx.lineTo(logoSize * (98/140), logoSize * (124/140));
      ctx.closePath();
      ctx.fillStyle = "#111111";
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 26px system-ui, sans-serif";
      const textX = contentX + logoSize + 15;
      const textY = footerY + 12;
      ctx.textBaseline = "middle";
      ctx.fillText("YESP LEADERS", textX, textY);

      ctx.fillStyle = "rgba(212, 175, 55, 0.85)";
      ctx.font = "bold 26px system-ui, sans-serif";
      const appNameWidth = ctx.measureText("YESP LEADERS").width;
      ctx.fillText(" · INSIGHTS", textX + appNameWidth, textY);

      // Direct Link text
      ctx.textAlign = "right";
      ctx.fillStyle = "#9CA3AF";
      ctx.font = "24px system-ui, sans-serif";
      ctx.fillText(displayHost, padX + cardW - 60, footerY + 2);

      // Trigger download
      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `yesp-share-${post.slug}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image generated and download started!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {trigger ? (
        <span onClick={() => setIsOpen(true)} className="inline-block cursor-pointer">
          {trigger}
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(true)}
          className="rounded-full flex items-center gap-1.5 border border-border bg-card hover:bg-accent transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" /> Share
        </Button>
      )}

      {/* Hidden canvas for PNG building */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md bg-[#09080E] text-white border-white/10 shadow-2xl p-6 sm:rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-lg font-serif font-bold text-center text-white flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4 text-amber-500" /> Share Insights Card
            </DialogTitle>
          </DialogHeader>

          {/* Simple Share Card Preview (Square 1:1 format) */}
          <div className="flex flex-col items-center gap-6 mt-2">
            <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[300px] mx-auto rounded-2xl overflow-hidden border border-white/10 text-white shadow-2xl p-5 flex flex-col justify-between bg-gradient-to-br from-[#121018] via-[#0E0D12] to-[#1C182A]">
              <div className="absolute top-0 right-0 w-36 h-36 rounded-full bg-amber-500/10 blur-[40px]" />
              <div className="absolute bottom-0 left-0 w-36 h-36 rounded-full bg-indigo-500/10 blur-[40px]" />

              {/* Card Container */}
              <div className="relative z-10 flex-1 flex flex-col justify-between p-4 rounded-xl border border-amber-500/20 bg-black/45 backdrop-blur-md">
                <div>
                  {/* Profile info */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500 border border-amber-500/30 flex items-center justify-center font-bold text-xs text-black shrink-0 overflow-hidden">
                        {post.profiles?.avatar_url ? (
                          <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          authorName[0].toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-white truncate inline-flex items-center gap-1">
                          {authorName}
                          {isVerified && <VerifiedBadge size={11} />}
                        </p>
                        {authorProfession && <p className="text-[9px] text-zinc-400 truncate">{authorProfession}</p>}
                      </div>
                    </div>

                    <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      {categoryName}
                    </span>
                  </div>

                  {/* Main Title */}
                  <h3 className="font-serif text-sm font-bold leading-snug text-white mb-1.5 text-left line-clamp-3">
                    {post.title}
                  </h3>

                  {/* Divider */}
                  <div className="w-full h-[1px] bg-gradient-to-r from-amber-500/40 to-transparent mb-2.5" />

                  {/* Excerpt */}
                  <p className="text-[10px] text-zinc-300 leading-relaxed text-left line-clamp-3">
                    {previewText}
                  </p>
                </div>

                {/* Footer branding */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[8px] font-semibold tracking-wider text-zinc-400">
                    <svg viewBox="0 0 140 140" className="w-4.5 h-4.5 flex-shrink-0 rounded-[3px]" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="140" height="140" rx="28" fill="#111111" />
                      <polygon points="70,28 22,124 118,124" fill="#FFFFFF" />
                      <polygon points="70,50 42,124 98,124" fill="#111111" />
                    </svg>
                    <span>YESP LEADERS <span className="text-amber-500">· INSIGHTS</span></span>
                  </div>
                  <div className="text-[8px] text-zinc-400 font-mono">
                    {displayHost}
                  </div>
                </div>
              </div>
            </div>

            {/* Direct Link Action */}
            <div className="w-full space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Post URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none"
                />
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-4 gap-2 w-full pt-2 border-t border-white/5">
              <Button
                variant="outline"
                size="sm"
                onClick={shareToX}
                className="border-white/10 text-white hover:bg-white/5 rounded-lg flex flex-col items-center gap-1.5 py-6 h-auto text-[10px] uppercase font-bold tracking-wider"
              >
                <Twitter className="w-4 h-4 text-[#1DA1F2]" />
                <span>X / Post</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareToLinkedIn}
                className="border-white/10 text-white hover:bg-white/5 rounded-lg flex flex-col items-center gap-1.5 py-6 h-auto text-[10px] uppercase font-bold tracking-wider"
              >
                <Linkedin className="w-4 h-4 text-[#0077B5]" />
                <span>LinkedIn</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareToWhatsApp}
                className="border-white/10 text-white hover:bg-white/5 rounded-lg flex flex-col items-center gap-1.5 py-6 h-auto text-[10px] uppercase font-bold tracking-wider"
              >
                <Send className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={generateImage}
                disabled={generating}
                className="bg-amber-500 hover:bg-amber-600 text-black rounded-lg flex flex-col items-center gap-1.5 py-6 h-auto text-[10px] uppercase font-bold tracking-wider"
              >
                <Download className="w-4 h-4" />
                <span>{generating ? "Saving..." : "Save PNG"}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
