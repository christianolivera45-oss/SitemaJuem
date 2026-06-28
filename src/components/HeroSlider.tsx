import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, MessageCircle, Play, Pause } from "lucide-react";
import { SiteSettings, HeroSlide } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface HeroSliderProps {
  settings: SiteSettings;
  onExploreCatalog: (slideLink?: string) => void;
}

export default function HeroSlider({ settings, onExploreCatalog }: HeroSliderProps) {
  const defaultSlides: HeroSlide[] = [
    {
      id: "slide-1",
      title: settings.bannerTitle || "Colección Exclusiva de Primavera",
      subtitle: settings.bannerSubtitle || "Descubre las últimas tendencias con descuentos de hasta el 40%.",
      imageUrl: settings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "slide-2",
      title: "Tendencias de Temporada",
      subtitle: "Colecciones cuidadosamente seleccionadas para expresar tu estilo único.",
      imageUrl: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80"
    },
    {
      id: "slide-3",
      title: "Accesorios & Complementos",
      subtitle: "Lentes, mochilas, relojes y detalles que transforman cualquier outfit.",
      imageUrl: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1600&q=80"
    }
  ];

  const slides = settings.heroSlides && settings.heroSlides.length > 0 
    ? settings.heroSlides 
    : defaultSlides;

  const optimizeImageUrl = (url: string) => {
    if (!url) return "";
    if (url.includes("unsplash.com")) {
      let optimized = url.replace("auto=format", "fm=webp");
      // On mobile devices we load a much smaller/lighter banner image
      const isMobile = window.innerWidth < 768;
      const targetSizeAndQuality = isMobile ? "&w=750&q=70" : "&w=1400&q=75";
      
      // strip existing width and quality parameters
      optimized = optimized.replace(/[&?]w=\d+/g, "").replace(/[&?]q=\d+/g, "");
      return optimized + (optimized.includes("?") ? "&" : "?") + targetSizeAndQuality;
    }
    return url;
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(1); // 1 = right, -1 = left

  // Touch gesture support states for mobile swiping
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(interval);
  }, [currentIndex, isPlaying, slides.length]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Touch handlers for mobile swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setIsPlaying(false);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsPlaying(true);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const handleWhatsAppContact = (slideTitle: string) => {
    const text = `Hola! Vi el banner "${slideTitle}" en la tienda ${settings.siteTitle} y me gustaría recibir más información sobre el catálogo y ofertas actuales.`;
    const cleanPhone = settings.whatsappNumber.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Variance configuration for motion slider transition based on SiteSettings
  const transitionType = settings.heroSliderTransition || "slide";

  const getVariants = () => {
    switch (transitionType) {
      case "fade":
        return {
          enter: { opacity: 0, scale: 1 },
          center: { zIndex: 1, opacity: 1, scale: 1 },
          exit: { zIndex: 0, opacity: 0, scale: 1 }
        };
      case "zoom":
        return {
          enter: { opacity: 0, scale: 1.06 },
          center: { zIndex: 1, opacity: 1, scale: 1 },
          exit: { zIndex: 0, opacity: 0, scale: 0.95 }
        };
      case "slide-up":
        return {
          enter: (dir: number) => ({
            y: dir > 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          }),
          center: {
            zIndex: 1,
            y: 0,
            opacity: 1,
            scale: 1
          },
          exit: (dir: number) => ({
            zIndex: 0,
            y: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          })
        };
      case "slide":
      default:
        return {
          enter: (dir: number) => ({
            x: dir > 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          }),
          center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1
          },
          exit: (dir: number) => ({
            zIndex: 0,
            x: dir < 0 ? "100%" : "-100%",
            opacity: 0,
            scale: 1
          })
        };
    }
  };

  const getTransition = () => {
    switch (transitionType) {
      case "fade":
        return {
          opacity: { duration: 0.5, ease: "easeInOut" }
        };
      case "zoom":
        return {
          scale: { duration: 0.6, ease: [0.25, 1, 0.5, 1] },
          opacity: { duration: 0.5, ease: "easeInOut" }
        };
      case "slide-up":
        return {
          y: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.6 },
          opacity: { duration: 0.45, ease: "easeInOut" }
        };
      case "slide":
      default:
        return {
          x: { type: "tween", ease: [0.25, 1, 0.5, 1], duration: 0.6 },
          opacity: { duration: 0.45, ease: "easeInOut" }
        };
    }
  };

  const slideVariants = getVariants();
  const slideTransition = getTransition();

  return (
    <div 
      className="relative h-[280px] sm:h-[380px] md:h-[480px] lg:h-[560px] w-full overflow-hidden bg-[#050B1A] text-white select-none group transform-gpu"
      onMouseEnter={() => setIsPlaying(false)}
      onMouseLeave={() => setIsPlaying(true)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides Viewport */}
      <div className="absolute inset-0 w-full h-full">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
            className="absolute inset-0 w-full h-full transform-gpu"
            style={{ willChange: "transform, opacity" }}
          >
            {/* Background Image - Boosted with visual filters to guarantee brightness even for dark images */}
            <img
              src={optimizeImageUrl(slides[currentIndex].imageUrl)}
              alt={slides[currentIndex].title}
              className="w-full h-full object-cover object-center transition-opacity duration-500 filter brightness-110 contrast-105 saturate-[1.05]"
              style={{ opacity: (settings.bannerOpacity !== undefined ? Math.max(settings.bannerOpacity, 85) : 95) / 100 }}
              referrerPolicy="no-referrer"
              loading="eager"
              fetchPriority="high"
            />
            
            {/* Premium Soft Ambient Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#050B1A]/85 via-[#050B1A]/50 to-transparent md:block hidden animate-fade-in"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B1A]/90 via-[#050B1A]/40 to-transparent md:hidden block"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#050B1A]/50 via-transparent to-transparent"></div>

            {/* Slide Content */}
            <div className="absolute inset-0 flex items-center uppercase-none">
              <div className="max-w-7xl mx-auto px-5 sm:px-8 w-full text-center md:text-left relative z-10">
                <div className="max-w-2xl transform-gpu">

                  <motion.h1 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15, duration: 0.5, ease: "easeInOut" }}
                    className="text-xl sm:text-3xl md:text-5xl lg:text-7.5xl font-serif font-light text-[#F4EAD7] tracking-wide leading-tight drop-shadow-md mb-2 md:mb-4 transform-gpu"
                    style={{ willChange: "opacity" }}
                  >
                    {slides[currentIndex].title}
                  </motion.h1>
                  
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.5, ease: "easeInOut" }}
                    className="text-[11px] sm:text-sm md:text-base text-zinc-350 font-sans tracking-wide leading-normal md:leading-relaxed max-w-xl font-light line-clamp-2 md:line-clamp-none transform-gpu"
                    style={{ color: "#D3CCD8", willChange: "opacity" }}
                  >
                    {slides[currentIndex].subtitle}
                  </motion.p>

                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.5, ease: "easeInOut" }}
                    className="mt-3.5 sm:mt-6 md:mt-8 flex flex-wrap items-center justify-center md:justify-start gap-4 transform-gpu"
                    style={{ willChange: "opacity" }}
                  >
                    <button
                      onClick={() => onExploreCatalog(slides[currentIndex].buttonLink)}
                      className="py-2 px-5 sm:py-3 sm:px-8 rounded-full font-sans font-bold text-[9px] sm:text-xs uppercase tracking-widest bg-[#D4A55A] text-[#050B1A] hover:bg-[#E6BF76] shadow-xl hover:shadow-[#D4A55A]/10 cursor-pointer transform active:scale-95 transition duration-300"
                    >
                      {slides[currentIndex].buttonText || "Explorar Colección"}
                    </button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Slide Navigation Left/Right Arrows - hidden on touch screens for clean experience, visible on hover desktop */}
      <button
        onClick={handlePrev}
        aria-label="Anterior"
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#0B1730]/65 hover:bg-[#D4A55A] border border-[#D4A55A]/25 hover:border-[#D4A55A] md:flex hidden items-center justify-center text-[#F4EAD7] hover:text-[#050B1A] transition duration-300 opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95"
      >
        <ChevronLeft className="h-4.5 w-4.5" />
      </button>

      <button
        onClick={handleNext}
        aria-label="Siguiente"
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#0B1730]/65 hover:bg-[#D4A55A] border border-[#D4A55A]/25 hover:border-[#D4A55A] md:flex hidden items-center justify-center text-[#F4EAD7] hover:text-[#050B1A] transition duration-300 opacity-0 group-hover:opacity-100 cursor-pointer active:scale-95"
      >
        <ChevronRight className="h-4.5 w-4.5" />
      </button>


    </div>
  );
}
