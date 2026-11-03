/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { CREATIVES, Creative } from './data/creatives';
import {
  RenderOptions,
  renderCardToCanvas,
  downloadCanvasAsPng,
  copyCanvasToClipboard,
  preloadImage,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
} from './utils/canvasRenderer';
import {
  Download,
  Heart,
  Loader2,
  X,
  Check,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Typewriter text effect component for footer
const TypewriterText: React.FC = () => {
  const text = 'Created by Amriz';
  const [displayed, setDisplayed] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayed.length < text.length) {
      timeout = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length + 1));
      }, 120);
    } else if (!isDeleting && displayed.length === text.length) {
      // Pause when fully typed
      timeout = setTimeout(() => {
        setIsDeleting(true);
      }, 3000);
    } else if (isDeleting && displayed.length > 0) {
      timeout = setTimeout(() => {
        setDisplayed(text.slice(0, displayed.length - 1));
      }, 60);
    } else if (isDeleting && displayed.length === 0) {
      timeout = setTimeout(() => {
        setIsDeleting(false);
      }, 500);
    }

    return () => clearTimeout(timeout);
  }, [displayed, isDeleting]);

  return (
    <span className="inline-flex items-center">
      <span>{displayed}</span>
      <span className="w-[1.5px] h-3.5 bg-stone-700 ml-0.5 animate-pulse inline-block" />
    </span>
  );
};

export default function App() {
  // User selects template: default to template 1
  const [selectedCreative, setSelectedCreative] = useState<Creative>(CREATIVES[0]);

  // User inputs: Blank initially, with 10% opacity placeholder hints
  const [name, setName] = useState<string>('');
  const [designation, setDesignation] = useState<string>('');

  const [isRendering, setIsRendering] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedModalUrl, setDownloadedModalUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Hidden / background canvas used to generate the high-res 1080x1350 card
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Preload all 5 creatives in background for instant rendering
  useEffect(() => {
    CREATIVES.forEach((c) => {
      preloadImage(c.url, c.fallbackUrl).catch(() => {});
    });
  }, []);

  const showToast = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const getCardFilename = (creativeNum: number) => {
    const cleanName = (name.trim() || 'Amris')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    return `GeriCare_Diwali_${cleanName}_Poster${creativeNum}.png`;
  };

  // Render card to canvas with the user selected creative and auto-color rules
  const renderCard = async (targetCreative: Creative): Promise<HTMLCanvasElement | null> => {
    if (!canvasRef.current) return null;
    setIsRendering(true);

    try {
      const renderOpts: RenderOptions = {
        creativeUrl: targetCreative.url,
        fallbackUrl: targetCreative.fallbackUrl,
        name: name.trim() || 'Amris',
        designation: designation.trim() || 'Senior Graphic Designer',
        yOffset: targetCreative.defaultY,
        alignment: targetCreative.suggestedAlignment,
        nameColor: targetCreative.nameColor,
        desigColor: targetCreative.desigColor,
        nameFontSize: targetCreative.nameFontSize,
        desigFontSize: targetCreative.desigFontSize,
        badgeStyle: 'minimal',
        scale: 1.0,
      };

      await renderCardToCanvas(canvasRef.current, renderOpts);
      return canvasRef.current;
    } catch (e) {
      console.error('Render error:', e);
      return null;
    } finally {
      setIsRendering(false);
    }
  };

  // 1. Small Download Button
  const handleDownload = async () => {
    setIsDownloading(true);
    const canvas = await renderCard(selectedCreative);
    if (!canvas) {
      setIsDownloading(false);
      return;
    }

    confetti({
      particleCount: 60,
      spread: 60,
      origin: { y: 0.6 },
      colors: [selectedCreative.nameColor, '#D4AF37', '#148858'],
    });

    downloadCanvasAsPng(canvas, getCardFilename(selectedCreative.number));

    // Show card to user after downloading as requested
    const previewUrl = canvas.toDataURL('image/png');
    setDownloadedModalUrl(previewUrl);

    setIsDownloading(false);
    showToast(`Poster #${selectedCreative.number} downloaded successfully!`);
  };

  // 2. Small Share WhatsApp Button
  const handleShareWhatsApp = async () => {
    const canvas = await renderCard(selectedCreative);
    if (!canvas) return;

    const messageText = `Wishing you a very Happy Diwali! From ${name ? name : 'Geri Care'}${
      designation ? ` (${designation})` : ''
    } - Geri Care Eldercare.`;

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      // On mobile devices supporting file share
      if (navigator.canShare) {
        const file = new File([blob], getCardFilename(selectedCreative.number), { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Geri Care Diwali Greeting',
              text: messageText,
            });
            showToast('Shared to WhatsApp!');
            return;
          } catch (e) {
            // share cancelled or fallback
          }
        }
      }

      // Fallback: download card and open WhatsApp
      downloadCanvasAsPng(canvas, getCardFilename(selectedCreative.number));
      window.open(
        `https://api.whatsapp.com/send?text=${encodeURIComponent(messageText)}`,
        '_blank'
      );
      showToast('Card saved! WhatsApp opened.');
    }, 'image/png');
  };

  // 3. Small Share Instagram Button (Opens Instagram App directly with the creative)
  const handleShareInstagram = async () => {
    const canvas = await renderCard(selectedCreative);
    if (!canvas) return;

    // Check if on mobile device (Android / iOS)
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], getCardFilename(selectedCreative.number), { type: 'image/png' });

      // Method A: Native Web Share API (Primary mobile path: user selects Instagram App directly)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Geri Care Diwali Greeting',
          });
          showToast('Shared to Instagram!');
          return;
        } catch (e) {
          // If cancelled, proceed to fallback app opening
        }
      }

      // Method B: Download image to device camera roll/downloads
      downloadCanvasAsPng(canvas, getCardFilename(selectedCreative.number));
      await copyCanvasToClipboard(canvas);

      if (isMobile) {
        // Deep link to Instagram Mobile App directly
        showToast('Card saved! Opening Instagram App...');
        window.location.href = 'instagram://app';
        
        // Secondary timeout fallback if deep-link app protocol isn't caught
        setTimeout(() => {
          window.location.href = 'instagram://camera';
        }, 800);
      } else {
        // Desktop browser fallback
        window.open('https://www.instagram.com/', '_blank');
        showToast('Card downloaded & copied! Opening Instagram.');
      }
    }, 'image/png');
  };

  // 4. Small Share LinkedIn Button
  const handleShareLinkedIn = async () => {
    const canvas = await renderCard(selectedCreative);
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], getCardFilename(selectedCreative.number), { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Happy Diwali from Geri Care',
            text: `Celebrating the Festival of Lights! Warm Diwali wishes from ${name || 'Geri Care'}.`,
          });
          showToast('Shared to LinkedIn!');
          return;
        } catch (e) {}
      }

      downloadCanvasAsPng(canvas, getCardFilename(selectedCreative.number));
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://gericare.in')}`,
        '_blank'
      );
      showToast('Card downloaded! Opening LinkedIn.');
    }, 'image/png');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#FAF7F5] font-sans antialiased text-stone-800 selection:bg-[#7D1848]/20 selection:text-[#7D1848]">
      
      {/* Offscreen Canvas (renders 1080x1350 card in high definition behind the scenes) */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="hidden"
      />

      {/* Geri Care Diwali Header Banner */}
      <header className="w-full bg-[#FAF7F5] border-b border-stone-200/80 shadow-2xs">
        <div className="max-w-3xl mx-auto px-3 pt-3 pb-2 sm:px-4 sm:pt-4 sm:pb-3">
          <div className="rounded-2xl overflow-hidden shadow-xs border border-stone-200/80 bg-[#FDF8EC]">
            <img
              src="/assets/aistudio/file_000000004c108211ba4d9ac823e85a29_211587d3.png"
              alt="Happy Diwali from Geri Care - Eldercare by Geriatricians"
              className="w-full h-auto object-cover select-none block max-h-48 sm:max-h-60 md:max-h-68"
            />
          </div>
        </div>
      </header>

      {/* Main Single Card Content: Template Selector, Name, Designation, and Small Buttons */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-center">
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/90 shadow-sm space-y-4">
          
          <div className="text-center pb-0.5">
            <h2 className="text-base font-bold text-[#7D1848]">
              Create Your Diwali Card
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Select a poster template and enter your details
            </p>
          </div>

          {/* 1. Small Preview of 5 Posters (User Selectable) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-stone-700 block">
                Choose Poster Template
              </label>
              <span className="text-[11px] font-semibold text-[#7D1848] bg-[#7D1848]/8 px-2 py-0.5 rounded-md">
                Poster #{selectedCreative.number}
              </span>
            </div>

            {/* 5 Thumbnails Grid */}
            <div className="grid grid-cols-5 gap-2">
              {CREATIVES.map((creative) => {
                const isSelected = creative.id === selectedCreative.id;
                return (
                  <button
                    key={creative.id}
                    type="button"
                    onClick={() => setSelectedCreative(creative)}
                    className={`group relative rounded-xl overflow-hidden aspect-[4/5] border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#7D1848] ring-2 ring-[#7D1848]/30 shadow-md scale-[1.04]'
                        : 'border-stone-200 hover:border-stone-400 opacity-75 hover:opacity-100 hover:shadow-2xs'
                    }`}
                    title={`Select Poster #${creative.number} - ${creative.title}`}
                  >
                    <img
                      src={creative.fallbackUrl}
                      alt={creative.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />

                    {/* Number Badge */}
                    <div
                      className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        isSelected
                          ? 'bg-[#7D1848] text-white shadow-2xs'
                          : 'bg-black/60 text-white group-hover:bg-[#7D1848]'
                      }`}
                    >
                      #{creative.number}
                    </div>

                    {/* Active Checkmark Overlay */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#7D1848]/15 flex items-center justify-center pointer-events-none">
                        <div className="w-5 h-5 rounded-full bg-[#7D1848] text-white flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input 1: Enter Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">
              Enter Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Amris"
              maxLength={45}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-stone-800 focus:border-[#7D1848] focus:ring-2 focus:ring-[#7D1848]/20 outline-hidden transition-all placeholder:text-stone-900/15 placeholder:font-normal"
            />
          </div>

          {/* Input 2: Enter Designation */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-stone-700 block">
              Enter Designation
            </label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="Senior Graphic Designer"
              maxLength={55}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-700 focus:border-[#7D1848] focus:ring-2 focus:ring-[#7D1848]/20 outline-hidden transition-all placeholder:text-stone-900/15 placeholder:font-normal"
            />
          </div>

          {/* Small Buttons: Download, WhatsApp, Instagram, LinkedIn */}
          <div className="pt-2 space-y-2">
            
            {/* Download Button (Small) */}
            <button
              onClick={handleDownload}
              type="button"
              disabled={isDownloading}
              className="w-full py-2.5 px-3 rounded-lg bg-[#7D1848] hover:bg-[#631238] active:scale-[0.99] text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-75"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
              )}
              <span>Download Poster</span>
            </button>

            {/* Small Share Buttons Row */}
            <div className="grid grid-cols-3 gap-2">
              
              {/* Share WhatsApp (Small) */}
              <button
                onClick={handleShareWhatsApp}
                type="button"
                className="py-2 px-2.5 rounded-lg bg-[#25D366] hover:bg-[#20BD5A] active:scale-[0.98] text-white font-semibold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Share to WhatsApp"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>WhatsApp</span>
              </button>

              {/* Share Instagram (Small - opens Instagram App) */}
              <button
                onClick={handleShareInstagram}
                type="button"
                className="py-2 px-2.5 rounded-lg bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 active:scale-[0.98] text-white font-semibold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Share to Instagram App"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Instagram</span>
              </button>

              {/* Share LinkedIn (Small) */}
              <button
                onClick={handleShareLinkedIn}
                type="button"
                className="py-2 px-2.5 rounded-lg bg-[#0A66C2] hover:bg-[#084e96] active:scale-[0.98] text-white font-semibold text-xs shadow-2xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Share to LinkedIn"
              >
                <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
                <span>LinkedIn</span>
              </button>
            </div>
          </div>

          {/* Toast message */}
          {notification && (
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] text-center font-medium shadow-2xs animate-in fade-in">
              {notification}
            </div>
          )}
        </div>
      </main>

      {/* "Only see creative after downloading it" Modal */}
      {downloadedModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-sm w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold text-[#7D1848]">
                Poster #{selectedCreative.number} Downloaded (1080 × 1350)
              </span>
              <button
                onClick={() => setDownloadedModalUrl(null)}
                className="w-6 h-6 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="aspect-[4/5] rounded-xl overflow-hidden border border-stone-200 shadow-xs">
              <img
                src={downloadedModalUrl}
                alt="Downloaded Diwali Card"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-500 font-medium">
                Saved to your device
              </span>
              <button
                onClick={() => setDownloadedModalUrl(null)}
                className="px-3 py-1 rounded-lg bg-[#7D1848] text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right Bottom: Created by Amriz (Typewriter effect + heart icon) */}
      <footer className="py-3 px-6">
        <div className="max-w-md mx-auto flex items-center justify-end">
          <div className="flex items-center gap-1.5 text-xs font-medium text-stone-600 tracking-tight">
            <TypewriterText />
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline-block animate-pulse shrink-0 ml-0.5" />
          </div>
        </div>
      </footer>
    </div>
  );
}
