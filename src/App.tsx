import { useState, useEffect, useMemo, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  ShoppingBag,
  Sliders,
  Settings,
  LogIn,
  LogOut,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Cpu,
  Save,
  Grid,
  List,
  Sparkles,
  Smartphone,
  CheckCircle2,
  CheckSquare,
  AlertCircle,
  Database,
  ArrowLeft,
  ShoppingCart,
  Image,
  Tag,
  Truck,
  Key,
  Lock,
  ShoppingBag as CartIcon,
  Palette,
  Eye,
  EyeOff,
  Type,
  Layout,
  MessageCircle,
  Shirt,
  Laptop,
  Home,
  Watch,
  Percent,
  Box,
  ChevronDown,
  HelpCircle,
  Menu,
  X,
  Ruler,
  ChevronRight,
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Upload,
  Loader2,
  Coffee,
  Gamepad2,
  Wrench,
  Gift,
  Crown,
  Heart,
  Footprints,
  BookOpen,
  Scissors,
  Gem,
  Flame,
  Lightbulb,
  Smile,
  Printer,
  Music,
  Dumbbell,
  Glasses,
  Baby,
  Wine,
  Tv,
  HardDrive,
  Headphones,
  Sofa,
  CreditCard,
  Star,
  Mail,
  Send,
  Info,
  MapPin,
  Globe,
  Instagram,
  Facebook,
  Phone,
  ShieldCheck,
  Receipt,
  Scale
} from "lucide-react";
import { Product, SiteSettings, ShopState, CartItem, Category, Subcategory, ProductVariant, is3DProduct, Shipping, ShippingOrigin } from "./types";
import ThemeStyles from "./components/ThemeStyles";
import ProductCard from "./components/ProductCard";
import ProductSlider from "./components/ProductSlider";
import ProductDetails from "./components/ProductDetails";
import CartDrawer from "./components/CartDrawer";
import Checkout from "./components/Checkout";
import HeroSlider from "./components/HeroSlider";
import SecurityPanel from "./components/SecurityPanel";
import { DashboardGeneral } from "./components/DashboardGeneral";
import { DashboardOrders } from "./components/DashboardOrders";
import { DashboardBills } from "./components/DashboardBills";
import { DashboardResumenGeneral } from "./components/DashboardResumenGeneral";
import { DashboardShippings } from "./components/DashboardShippings";
import AIAssistant from "./components/AIAssistant";
import WhatsAppWidget from "./components/WhatsAppWidget";
import ImageGalleryEditor from "./components/ImageGalleryEditor";
import GoogleReviewsCompact from "./components/GoogleReviewsCompact";
import AddToCartModal from "./components/AddToCartModal";


export const normalizeText = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, " ")     // replace non-alphanumeric with space
    .replace(/\s+/g, " ")            // collapse multi-spaces
    .trim();
};

export const generateSlug = (text: string): string => {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9\s-]/g, "")    // remove special characters
    .trim()
    .replace(/\s+/g, "-")            // space to dash
    .replace(/-+/g, "-");            // collapse multiple dashes
};

export const calculateRelevance = (
  product: Product,
  query: string,
  dbCategories?: Category[],
  dbSubcategories?: Subcategory[]
): number => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const normalizedName = normalizeText(product.name);
  const normalizedDesc = normalizeText(product.description || "");
  
  // Resolve product category name
  const mainCat = (dbCategories || []).find(c => c.id === product.categoria_id);
  const mainCatName = mainCat ? normalizeText(mainCat.nombre) : "";
  const fallbackCatName = product.category ? normalizeText(product.category) : "";
  
  // Resolve subcategory name
  const subCat = (dbSubcategories || []).find(s => s.id === product.subcategoria_id);
  const subCatName = subCat ? normalizeText(subCat.nombre) : "";

  // Normalize colors and sizes to act as tags
  const colorsStr = (product.colors || []).map(normalizeText).join(" ");
  const sizesStr = (product.sizes || []).map(normalizeText).join(" ");

  const queryTokens = normalizedQuery.split(" ").filter(t => t.length > 0);
  if (queryTokens.length === 0) return 0;

  let score = 0;

  // 1. Exact Name match or name starts with query
  if (normalizedName === normalizedQuery) {
    score += 500;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 250;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 150;
  }

  // 2. Word tokens match in Name
  queryTokens.forEach(token => {
    const cleanToken = token.endsWith("s") && token.length > 3 ? token.slice(0, -1) : token;
    
    const matchedNameWords = normalizedName.split(" ").some(word => {
      const cleanWord = word.endsWith("s") && word.length > 3 ? word.slice(0, -1) : word;
      return cleanWord.includes(cleanToken) || cleanToken.includes(cleanWord);
    });

    if (matchedNameWords) {
      score += 80;
    } else if (normalizedName.includes(token)) {
      score += 40;
    }
  });

  // 3. Category & Subcategory match
  if (mainCatName && (mainCatName.includes(normalizedQuery) || normalizedQuery.includes(mainCatName))) {
    score += 100;
  } else if (fallbackCatName && (fallbackCatName.includes(normalizedQuery) || normalizedQuery.includes(fallbackCatName))) {
    score += 60;
  }
  if (subCatName && (subCatName.includes(normalizedQuery) || normalizedQuery.includes(subCatName))) {
    score += 80;
  }

  queryTokens.forEach(token => {
    if (mainCatName && mainCatName.includes(token)) score += 20;
    if (fallbackCatName && fallbackCatName.includes(token)) score += 10;
    if (subCatName && subCatName.includes(token)) score += 15;
  });

  // 4. Description match
  if (normalizedDesc.includes(normalizedQuery)) {
    score += 50;
  }
  queryTokens.forEach(token => {
    if (normalizedDesc.includes(token)) {
      score += 10;
    }
  });

  // 5. Colors and Sizes matches (as tags)
  queryTokens.forEach(token => {
    if (colorsStr.includes(token)) score += 15;
    if (sizesStr.includes(token)) score += 15;
  });

  return score;
};

const DEFAULT_SETTINGS: SiteSettings = {
  siteTitle: "Ventas Juem",
  siteSubtitle: "Moda, tecnología y accesorios con envío a todo el país.",
  bannerTitle: "Colección Exclusiva de Primavera",
  bannerSubtitle: "Descubre las últimas tendencias con descuentos de hasta el 40%.",
  bannerImageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80",
  bannerOpacity: 80,
  featuredSliderSpeed: 2500,
  googleAnalyticsId: "",
  googleTagManagerId: "",
  metaPixelId: "",
  whatsappNumber: "5491123456789",
  primaryColor: "#2563eb",
  accentColor: "#10b981",
  themeMode: "dark",
  promotionBannerText: "🚚 ¡15% de DESCUENTO en toda la tienda! Código: BUELO15",
  promotionBannerText2: "🎁 ¡Envío GRATIS en compras mayores de $2000 para Pinamar, Salinas, Marindia, Neptunia! Elige tu de agencia favorita y nosotros lo cubrimos.",
  promotionBannerBgColor: "#4f46e5",
  promotionBannerTextColor: "#ffffff",
  promotionBannerTransition: "slide",
  heroSliderTransition: "slide",
  showPromotionBanner: true,
  lowStockThreshold: 5,
  mercadopagoActive: true,
  mercadopagoMessage: "Paga de manera 100% segura con cuotas sin recargo utilizando tus tarjetas favoritas: OCA, VISA, MasterCard, Lider y Diners, o en redes de cobranza Abitab y Redpagos. Te enviaremos el link de pago seguro al iniciar el chat de WhatsApp.",
  mercadopagoPublicKey: "",
  mercadopagoAccessToken: "",
  exchangeRate: 40,
  transferActive: true,
  transferDetails: "Realiza tu transferencia bancaria directa de forma rápida y segura desde BROU, Itaú, Santander, BBVA o cualquier banco de Uruguay. Al enviar tu pedido, te daremos los datos de cuenta para que nos envíes el comprobante.",
  cashActive: true,
  cashMessage: "Abona en efectivo al recibir tu pedido (válido para Montevideo y zonas metropolitanas coordinadas). Pagas cómodamente en mano a nuestro repartidor al momento de la entrega.",
  heroSlides: [
    {
      id: "slide-1",
      title: "Colección Exclusiva de Primavera",
      subtitle: "Descubre las últimas tendencias con descuentos de hasta el 40%.",
      imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
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
  ],
  logoType: "text",
  logoText: "J",
  logoImageUrl: "",
  footerCol1Title: "🚀 Compra Personalizada",
  footerCol1Text: "Realiza tus pedidos seleccionando tus talles y colores favoritos. El carrito envía una lista formateada directo a nuestro WhatsApp de atención oficial para coordinar pago y entrega express.",
  footerCol2Title: "🌟 Calidad Asegurada",
  footerCol2Text: "Todos los productos que visualizas pasan por un control estricto de empaque y selección. Ofrecemos cambio de talle inmediato dentro de las 72 horas de recibida tu compra.",
  footerCol3Title: "📞 Soporte Directo",
  footerCol3Text: "¿Habiendo dudas con talles o stock rápido? Pícale al botón de consulta express en la ficha de cada producto y un asesor te responderá inmediatamente en WhatsApp.",
  footerCopyright: "Desarrollado con tecnología de punta responsive. Reservados todos los derechos.",
  pickupActive: true,
  pickupAddress: "Av. Italia 3824, Parque Batlle, Montevideo, Uruguay",
  pickupHours: "Lunes a Viernes de 10:00 a 18:00 hs y Sábados de 09:00 a 13:00 hs.",
  pickupSuccessMessage: "Listo para retirar el mismo día hábil",
  deliveryActive: true,
  deliveryMethods: [
    {
      id: "express_mvd",
      title: "Envío Express en 3 horas dentro de Montevideo (ver zonas)",
      subtext: "*antes de 16h de L a V",
      iconType: "motorcycle"
    },
    {
      id: "mvd_normal",
      title: "Envío dentro de Montevideo (24 a 48 horas)",
      subtext: null,
      iconType: "truck_orange"
    },
    {
      id: "ues",
      title: "Envío a todo el país por UES",
      subtext: null,
      iconType: "ues"
    },
    {
      id: "dac",
      title: "Envío a todo el país por DAC (Agencia Central)",
      subtext: null,
      iconType: "dac"
    },
    {
      id: "depunta",
      title: "Envío a Maldonado por De Punta",
      subtext: null,
      iconType: "depunta"
    }
  ],
  invoiceOptionActive: true,
  freeShippingActive: true,
  freeShippingMinAmount: 2000,
  freeShippingRegions: "Pinamar, Salinas, Marindia, Neptunia",
  defaultFirstName: "Christian",
  defaultLastName: "Olivera",
  defaultPhone: "095085181",
  googleReviewsEnabled: true,
  googleReviewsSource: "custom",
  googleReviewsRating: 4.9,
  googleReviewsTotal: 184,
  googleReviewsCustomList: [],
  googleClientId: "",
  googleClientSecret: "",
  emailSenderEnabled: true,
  emailSenderProvider: "resend",
  resendApiKey: "",
  mailgunApiKey: "",
  mailgunDomain: "sandbox432ebc5c64c84856bb985204939f0411.mailgun.org",
  mailgunRegion: "us",
  emailSenderSmtpHost: "",
  emailSenderSmtpPort: 465,
  emailSenderSmtpUser: "",
  emailSenderSmtpPass: "",
  emailSenderFromAddress: "Administración Juem <administracion@notificaciones.juem.com.uy>",
  emailTemplateOrderCreatedSubject: "¡Gracias por tu compra! Tu pedido #{{orderId}} ha sido recibido",
  emailTemplateOrderStatusChangedSubject: "Actualización de tu pedido #{{orderId}} - {{statusText}}",
  emailTemplateOrderCreatedBody: "Muchas gracias por realizar tu compra con nosotros. Tu pago ha sido aprobado correctamente y tu pedido ya está siendo preparado para entrega. Aquí tienes los detalles completos de tu compra:",
  emailTemplateOrderStatusChangedBody: "Te notificamos que el estado de tu pedido #{{orderId}} ha sido actualizado por nuestro equipo de logística."
};

const ICON_LABELS: Record<string, string> = {
  Shirt: "👕 Ropa / Remeras",
  Smartphone: "📱 Celulares",
  Laptop: "💻 Computadoras / Laptops",
  Printer: "🖨️ Impresiones 3D",
  Coffee: "☕ Mate / Bazar",
  Gamepad2: "🎮 Gaming / Consolas",
  Wrench: "🔧 Herramientas",
  Glasses: "👓 Lentes / Gafas",
  Watch: "⌚ Relojes / Smartwatch",
  Tv: "📺 Tecnología / Pantallas",
  Home: "🏠 Hogar / Decoración",
  Sofa: "🛋️ Muebles / Living",
  Gem: "💎 Joyería / Accesorios",
  Gift: "🎁 Regalos",
  Smile: "🧸 Peluches / Juguetes",
  Dumbbell: "🏋️ Deportes / Fit",
  Music: "🎵 Música / Parlantes",
  Sparkles: "✨ Destacados / Novedades",
  Percent: "🏷️ Ofertas / Liquidaciones",
  Palette: "🎨 Diseño / Personalizado",
  BookOpen: "📖 Librería / Libros",
  Compass: "🧭 Aventura",
  Flame: "🔥 Tendencias",
  Heart: "❤️ Favoritos",
  Box: "📦 Otros"
};

const getCategoryIcon = (categoryOrIcon: string) => {
  const cat = (categoryOrIcon || "").toLowerCase();
  
  if (cat === "todos" || cat === "grid") return <Grid className="h-5 w-5 animate-pulse" />;
  if (cat === "shirt" || cat === "ropa") return <Shirt className="h-5 w-5" />;
  if (cat === "smartphone" || cat === "celular" || cat === "celulares") return <Smartphone className="h-5 w-5" />;
  if (cat === "sparkles" || cat === "destacado" || cat === "destacados") return <Sparkles className="h-5 w-5" />;
  if (cat === "home" || cat === "hogar") return <Home className="h-5 w-5" />;
  if (cat === "watch" || cat === "relojes") return <Watch className="h-5 w-5" />;
  if (cat === "percent" || cat === "descuentos") return <Percent className="h-5 w-5" />;
  if (cat === "laptop" || cat === "pc") return <Laptop className="h-5 w-5" />;
  if (cat === "palette" || cat === "diseno") return <Palette className="h-5 w-5" />;
  if (cat === "tag" || cat === "promos" || cat === "etiqueta") return <Tag className="h-5 w-5" />;
  if (cat === "box" || cat === "paquete") return <Box className="h-5 w-5" />;
  if (cat === "coffee" || cat === "mate") return <Coffee className="h-5 w-5" />;
  if (cat === "gamepad2" || cat === "gaming") return <Gamepad2 className="h-5 w-5" />;
  if (cat === "wrench" || cat === "herramientas") return <Wrench className="h-5 w-5" />;
  if (cat === "gift" || cat === "regalos" || cat === "regalo") return <Gift className="h-5 w-5" />;
  if (cat === "crown" || cat === "premium") return <Crown className="h-5 w-5" />;
  if (cat === "heart" || cat === "favoritos") return <Heart className="h-5 w-5" />;
  if (cat === "footprints" || cat === "calzado" || cat === "zapatillas" || cat === "zapatos") return <Footprints className="h-5 w-5" />;
  if (cat === "bookopen" || cat === "libreria" || cat === "libros" || cat === "agenda") return <BookOpen className="h-5 w-5" />;
  if (cat === "scissors" || cat === "manualidades" || cat === "costura") return <Scissors className="h-5 w-5" />;
  if (cat === "gem" || cat === "joyas" || cat === "joyeria" || cat === "accesorios") return <Gem className="h-5 w-5" />;
  if (cat === "flame" || cat === "hot" || cat === "tendencia") return <Flame className="h-5 w-5" />;
  if (cat === "lightbulb" || cat === "iluminacion" || cat === "lamparas") return <Lightbulb className="h-5 w-5" />;
  if (cat === "smile" || cat === "juguetes" || cat === "ninos") return <Smile className="h-5 w-5" />;
  if (cat === "printer" || cat === "impresora" || cat === "impresiones") return <Printer className="h-5 w-5" />;
  if (cat === "music" || cat === "musica") return <Music className="h-5 w-5" />;
  if (cat === "dumbbell" || cat === "deportes" || cat === "deporte" || cat === "fitness") return <Dumbbell className="h-5 w-5" />;
  if (cat === "glasses" || cat === "lentes" || cat === "gafas") return <Glasses className="h-5 w-5" />;
  if (cat === "baby" || cat === "bebe" || cat === "bebes") return <Baby className="h-5 w-5" />;
  if (cat === "wine" || cat === "bazar" || cat === "copas" || cat === "vajilla") return <Wine className="h-5 w-5" />;
  if (cat === "tv" || cat === "televisores" || cat === "pantallas") return <Tv className="h-5 w-5" />;
  if (cat === "harddrive" || cat === "discos" || cat === "almacenamiento") return <HardDrive className="h-5 w-5" />;
  if (cat === "headphones" || cat === "auriculares") return <Headphones className="h-5 w-5" />;
  if (cat === "sofa" || cat === "muebles" || cat === "deco" || cat === "decoracion") return <Sofa className="h-5 w-5" />;
  if (cat === "cpu" || cat === "computacion" || cat === "hardware") return <Cpu className="h-5 w-5" />;

  // 1. Impresiones / 3D keyword check
  if (
    cat.includes("impresio") ||
    cat.includes("3d") ||
    cat.includes("filamento") ||
    cat.includes("pla") ||
    cat.includes("llaver")
  ) {
    return <Printer className="h-5 w-5" />;
  }

  // 2. Ropa / Moda / Vestimenta keyword check
  if (
    cat.includes("ropa") ||
    cat.includes("vest") ||
    cat.includes("moda") ||
    cat.includes("prend") ||
    cat.includes("remera") ||
    cat.includes("abrigo") ||
    cat.includes("buzo") ||
    cat.includes("jean") ||
    cat.includes("panta") ||
    cat.includes("shirt")
  ) {
    return <Shirt className="h-5 w-5" />;
  }

  // 3. Calzado / Zapatillas
  if (
    cat.includes("calza") ||
    cat.includes("zapat") ||
    cat.includes("bota") ||
    cat.includes("sandalia") ||
    cat.includes("foot")
  ) {
    return <Footprints className="h-5 w-5" />;
  }

  // 4. Electrónica / Tecnología / Artículos electrónicos keyword check
  if (
    cat.includes("electron") ||
    cat.includes("tecno") ||
    cat.includes("celular") ||
    cat.includes("notebook") ||
    cat.includes("comput") ||
    cat.includes("smart") ||
    cat.includes("tablet") ||
    cat.includes("audio") ||
    cat.includes("parlante") ||
    cat.includes("chip") ||
    cat.includes("laptop") ||
    cat.includes("phone")
  ) {
    return <Laptop className="h-5 w-5" />;
  }

  // 5. Hogar / Decoración / Casa / Sofa keyword check
  if (
    cat.includes("hogar") ||
    cat.includes("casa") ||
    cat.includes("mueble") ||
    cat.includes("decor") ||
    cat.includes("jardin") ||
    cat.includes("sofa")
  ) {
    return <Home className="h-5 w-5" />;
  }

  // 6. Bazar / Mate / Cocina / Copas / Vasos
  if (
    cat.includes("bazar") ||
    cat.includes("cocina") ||
    cat.includes("mate") ||
    cat.includes("cafe") ||
    cat.includes("taza") ||
    cat.includes("termo") ||
    cat.includes("vaso") ||
    cat.includes("copa") ||
    cat.includes("vajilla") ||
    cat.includes("wine")
  ) {
    return <Coffee className="h-5 w-5" />;
  }

  // 7. Accesorios / Relojes / Bolsos keyword check
  if (
    cat.includes("accesor") ||
    cat.includes("joya") ||
    cat.includes("reloj") ||
    cat.includes("bols") ||
    cat.includes("mochila") ||
    cat.includes("cartera") ||
    cat.includes("watch") ||
    cat.includes("gem")
  ) {
    return <Watch className="h-5 w-5" />;
  }

  // 8. Gaming
  if (
    cat.includes("game") ||
    cat.includes("juego") ||
    cat.includes("consola") ||
    cat.includes("playstation") ||
    cat.includes("xbox") ||
    cat.includes("nintendo")
  ) {
    return <Gamepad2 className="h-5 w-5" />;
  }

  // 9. Regalos / Juguetes
  if (
    cat.includes("regal") ||
    cat.includes("gift") ||
    cat.includes("juguet") ||
    cat.includes("peluch") ||
    cat.includes("smile") ||
    cat.includes("nino")
  ) {
    return <Gift className="h-5 w-5" />;
  }

  // 10. Ofertas / Descuentos / Liquidación / Sale keyword check
  if (
    cat.includes("oferta") ||
    cat.includes("promoc") ||
    cat.includes("descu") ||
    cat.includes("liquid") ||
    cat.includes("sale") ||
    cat.includes("porcent")
  ) {
    return <Percent className="h-5 w-5" />;
  }

  // Otros / Caja / Estrellas / Predeterminado
  return <Box className="h-5 w-5" />;
};

// Mapeo amigable de categorías internas para mostrar en UI
const getCategoryDisplayName = (cat: string) => {
  if (cat === "Artículos electrónicos") return "Electrónica";
  return cat;
};

// Temas y Paletas de Colores Predeterminadas para el eCommerce
const THEME_PRESETS = [
  {
    name: "Colores Juem 🎨",
    primaryColor: "#D4A55A",
    accentColor: "#E6BF76",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Apex Clásico",
    primaryColor: "#2563eb",
    accentColor: "#10b981",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Moda Veraniega Warm",
    primaryColor: "#ea580c",
    accentColor: "#e11d48",
    themeMode: "light" as "dark" | "light"
  },
  {
    name: "Lujo & Carbono (Gold)",
    primaryColor: "#ca8a04",
    accentColor: "#e11d48",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Nórdico Suave",
    primaryColor: "#64748b",
    accentColor: "#0284c7",
    themeMode: "light" as "dark" | "light"
  },
  {
    name: "Neón Cyberpunk",
    primaryColor: "#d946ef",
    accentColor: "#06b6d4",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Esmeralda Eco",
    primaryColor: "#059669",
    accentColor: "#10b981",
    themeMode: "light" as "dark" | "light"
  },
  {
    name: "Misterio Forestal",
    primaryColor: "#15803d",
    accentColor: "#f59e0b",
    themeMode: "dark" as "dark" | "light"
  },
  {
    name: "Rosa de París",
    primaryColor: "#ec4899",
    accentColor: "#ae2d68",
    themeMode: "light" as "dark" | "light"
  }
];

// Subcategorías predefinidas para no llenar la tienda de categorías vacías
const SUBCATEGORIES_MAP: Record<string, { id: string; name: string }[]> = {
  "Ropa": [
    { id: "all", name: "Ver todo Ropa" },
    { id: "hombre", name: "Hombre" },
    { id: "mujer", name: "Mujer" },
    { id: "invierno", name: "Invierno" }
  ],
  "Artículos electrónicos": [
    { id: "all", name: "Ver todo Electrónica" },
    { id: "celulares", name: "Celulares" },
    { id: "audio", name: "Audio" },
    { id: "pc", name: "PC y accesorios" }
  ],
  "Accesorios": [
    { id: "all", name: "Ver todo Accesorios" },
    { id: "mochilas", name: "Mochilas" },
    { id: "relojes", name: "Relojes" },
    { id: "fundas", name: "Fundas" }
  ],
  "Hogar": [
    { id: "all", name: "Ver todo Hogar" },
    { id: "decoracion", name: "Decoración" },
    { id: "cocina", name: "Cocina" },
    { id: "organizacion", name: "Organización" }
  ]
};

// Palabras clave para mapear dinámicamente los productos existentes y nuevos a subcategorías de manera invisible
const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  hombre: ["hombre", "men", "masculino", "camisa hombre", "pantalón hombre", "chaqueta hombre"],
  mujer: ["mujer", "women", "femenino", "vestido", "blusa", "falda", "cartera mujer"],
  invierno: ["invierno", "winter", "abrigo", "jacket", "chaqueta", "bomber", "buzo", "sudadera", "capucha", "suéter", "sueter", "saco", "lana", "guantes", "bufanda"],
  
  celulares: ["celular", "teléfono", "telefono", "phone", "iphone", "samsung", "cargador", "funda celular", "xiaomi", "motorola"],
  audio: ["audio", "parlante", "audífono", "audifono", "auricular", "headphones", "bluetooth", "sonido", "sonar", "micrófono", "microfono"],
  pc: ["teclado", "mouse", "monitor", "pantalla", "computadora", "pc", "gamer", "usb", "cable", "organizador cables", "disco duro", "memoria", "portatil", "laptop"],
  
  mochilas: ["mochila", "bolso", "cartera", "morral", "maletín", "viaje", "organizador"],
  relojes: ["reloj", "smartwatch", "reloj inteligente", "cronógrafo", "cronografo", "pulsera watch"],
  fundas: ["funda", "estuche", "case", "protector", "cubierta"],
  
  decoracion: ["vela", "cuadro", "lámpara", "lampara", "adorno", "plant", "espejo", "alfombra", "deco", "decoración", "decoracion"],
  cocina: ["cocina", "taza", "plato", "vaso", "cubiertos", "artículos cocina", "cafetera", "tetera", "organizador cocina", "ollas", "sarten"],
  organizacion: ["estante", "caja", "reloj pared", "perchero", "organiz", "cajón", "cajon", "almacenamiento", "percheros"]
};

export function getProductSizeChartData(p: Partial<Product>) {
  const sizes = p.sizes || [];
  const defaultCols = ["Talle", "Sisa / Ancho (cm)", "Largo Total (cm)"];
  
  let data = p.sizeChartData;
  if (!data) {
    data = {
      columns: defaultCols,
      rows: []
    };
  }
  
  // Clean column header list to ensure 'Talle' is first
  if (!data.columns || data.columns.length === 0) {
    data.columns = defaultCols;
  }
  if (data.columns[0] !== "Talle") {
    data.columns = ["Talle", ...data.columns.filter(c => c !== "Talle")];
  }
  
  // Align rows with active sizes
  const rows = [...(data.rows || [])];
  
  const mergedRows = sizes.map(sz => {
    const existing = rows.find(r => r["Talle"] === sz);
    if (existing) {
      return existing;
    } else {
      const newRow: Record<string, string> = { "Talle": sz };
      data?.columns.forEach(col => {
        if (col !== "Talle") {
          newRow[col] = "";
        }
      });
      return newRow;
    }
  });
  
  return {
    columns: data.columns,
    rows: mergedRows
  };
}

function deductProductsStockClient(products: any[], items: any[], dep: string): any[] {
  return products.map(p => {
    const itemsToDeduct = items.filter(it => String(it.productId) === String(p.id));
    if (itemsToDeduct.length > 0) {
      const clonedProduct = { ...p };
      for (const it of itemsToDeduct) {
        const qty = it.quantity || 1;
        const pinStock = clonedProduct.stockPinamar || 0;
        const mvdStock = clonedProduct.stockMontevideo || 0;
        
        let pinDeduct = 0;
        let mvdDeduct = 0;
        
        if (dep === "Montevideo") {
          if (mvdStock >= qty) {
            mvdDeduct = qty;
          } else {
            mvdDeduct = mvdStock;
            pinDeduct = qty - mvdStock;
          }
        } else {
          if (pinStock >= qty) {
            pinDeduct = qty;
          } else {
            pinDeduct = pinStock;
            mvdDeduct = qty - pinStock;
          }
        }

        clonedProduct.stockPinamar = Math.max(0, pinStock - pinDeduct);
        clonedProduct.stockMontevideo = Math.max(0, mvdStock - mvdDeduct);
        clonedProduct.stock = Math.max(0, (clonedProduct.stock || 0) - qty);

        if (it.variantId && clonedProduct.variants) {
          clonedProduct.variants = clonedProduct.variants.map((v: any) => {
            if (String(v.id) === String(it.variantId)) {
              const clonedV = { ...v };
              const vPinStock = clonedV.stockPinamar || 0;
              const vMvdStock = clonedV.stockMontevideo || 0;
              
              let vPinDeduct = 0;
              let vMvdDeduct = 0;
              
              if (dep === "Montevideo") {
                if (vMvdStock >= qty) {
                  vMvdDeduct = qty;
                } else {
                  vMvdDeduct = vMvdStock;
                  vPinDeduct = qty - vMvdStock;
                }
              } else {
                if (vPinStock >= qty) {
                  vPinDeduct = qty;
                } else {
                  vPinDeduct = vPinStock;
                  vMvdDeduct = qty - vPinStock;
                }
              }

              clonedV.stockPinamar = Math.max(0, vPinStock - vPinDeduct);
              clonedV.stockMontevideo = Math.max(0, vMvdStock - vMvdDeduct);
              clonedV.stock = Math.max(0, (clonedV.stock || 0) - qty);
              return clonedV;
            }
            return v;
          });
        }
      }
      return clonedProduct;
    }
    return p;
  });
}

export default function App() {
  // Store state loaded from api
  const [store, setStore] = useState<ShopState>({
    products: [],
    categories: ["Ropa", "Artículos electrónicos", "Accesorios", "Hogar"],
    dbCategories: [
      { id: "ropa", nombre: "Ropa", icono: "Shirt", orden: 1, active: true },
      { id: "electronica", nombre: "Artículos electrónicos", icono: "Smartphone", orden: 2, active: true },
      { id: "accesorios", nombre: "Accesorios", icono: "Sparkles", orden: 3, active: true },
      { id: "hogar", nombre: "Hogar", icono: "Home", orden: 4, active: true }
    ],
    dbSubcategories: [
      { id: "hombre", nombre: "Hombre", categoria_id: "ropa" },
      { id: "mujer", nombre: "Mujer", categoria_id: "ropa" },
      { id: "invierno", nombre: "Invierno", categoria_id: "ropa" },
      { id: "celulares", nombre: "Celulares", categoria_id: "electronica" },
      { id: "audio", nombre: "Audio", categoria_id: "electronica" },
      { id: "pc", nombre: "PC y accesorios", categoria_id: "electronica" },
      { id: "mochilas", nombre: "Mochilas", categoria_id: "accesorios" },
      { id: "lentes", nombre: "Gafas de Sol", categoria_id: "accesorios" },
      { id: "decoracion", nombre: "Decoración", categoria_id: "hogar" },
      { id: "organizacion", nombre: "Organización", categoria_id: "hogar" }
    ],
    settings: DEFAULT_SETTINGS
  });

  // Client statuses
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"synced" | "syncing" | "error">("synced");
  const [errorMessage, setErrorMessage] = useState("");
  const [showMpAccessToken, setShowMpAccessToken] = useState(false);

  // Search & Navigation
  const [activeTab, setActiveTab] = useState<"storefront" | "admin" | "checkout">("storefront");
  const [adminSection, setAdminSection] = useState<"general" | "products" | "categories" | "promos" | "security" | "stock" | "dashboard" | "banner" | "footer" | "payments" | "checkout_config" | "sales" | "reviews" | "bills" | "finances" | "shippings" | "assistant">("dashboard");
  const [showAIAssistantSidebar, setShowAIAssistantSidebar] = useState(false);
  const [showAdminDevicePreview, setShowAdminDevicePreview] = useState(true);
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSearchQuery, setTempSearchQuery] = useState("");
  
  useEffect(() => {
    setTempSearchQuery(searchQuery);
  }, [searchQuery]);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isHeaderSearchOpen, setIsHeaderSearchOpen] = useState(false);
  const [bannerProductSearch, setBannerProductSearch] = useState("");
  const [uploadingSlideIdx, setUploadingSlideIdx] = useState<number | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingEmailHeader, setUploadingEmailHeader] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [showAllProductsFlat, setShowAllProductsFlat] = useState<boolean>(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);

  // Sorting & Filtering States
  const [sortBy, setSortBy] = useState<string>("featured");
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState<boolean>(false);
  const [mobileLayoutMode, setMobileLayoutMode] = useState<"grid" | "list">("grid");
  const [stockFilterTab, setStockFilterTab] = useState<"all" | "outOfStock" | "lowStock" | "alerts">("alerts");
  const [stockSearchQuery, setStockSearchQuery] = useState<string>("");
  const [stockPage, setStockPage] = useState<number>(1);
  const [stockSkuFilter, setStockSkuFilter] = useState<string>("");
  const [stockNameFilter, setStockNameFilter] = useState<string>("");
  const [stockCostFilter, setStockCostFilter] = useState<string>("all");
  const [stockLocalFilter, setStockLocalFilter] = useState<string>("all");
  const [stockMlFilter, setStockMlFilter] = useState<string>("all");
  const [stockMvdFilter, setStockMvdFilter] = useState<string>("all");
  const [stockPinFilter, setStockPinFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Auto-reset pagination on catalog changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubcategory, searchQuery, sortBy, onlyInStock]);

  // Custom toast notification system to bypass iframe alert limits
  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const adminType = type === "info" ? "neutral" : type;
    showAdminToast(message, adminType);
  };

  // Helper to verify admin token with backend
  const verifyAdminToken = async (token: string) => {
    try {
      const res = await fetch("/api/admin/verify", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.valid && data.user?.role === "admin") {
          setAuthToken(token);
        } else {
          handleLogout();
          showAdminToast("Acceso denegado: permisos de administrador requeridos.", "error");
        }
      } else {
        handleLogout();
      }
    } catch (err) {
      console.error("No se pudo verificar el token administrativa:", err);
    }
  };

  const navigateAdminSection = (section: "general" | "products" | "categories" | "promos" | "security" | "stock" | "dashboard" | "banner" | "footer" | "payments" | "checkout_config" | "sales" | "reviews" | "emails" | "bills" | "finances" | "shippings" | "assistant") => {
    setAdminSection(section);
    setEditingProduct(null);
    setIsNewProductMode(false);
    setMobileAdminMenuOpen(false);
    window.history.pushState(null, "", `/admin/${section}`);
    if (section === "emails") {
      fetchEmailLogs();
    }
  };

  // URL routing helpers
  const parseRoute = (currentCategories?: any[], currentProducts?: any[]) => {
    const categoriesList = currentCategories || store.dbCategories || [];
    const subcategoriesList = store.dbSubcategories || [];
    const productsList = currentProducts || store.products || [];
    const path = window.location.pathname.toLowerCase().replace(/\/$/, ""); // remove trailing slash
    const segments = path.split("/").filter(Boolean); // e.g. ["ropa", "hombre"]

    const urlParams = new URLSearchParams(window.location.search);
    let prodId: string | null = null;
    if (segments[0] === "producto" && segments[1]) {
      prodId = segments[1];
    } else {
      prodId = urlParams.get("product");
    }

    if (prodId) {
      const prod = productsList.find(p => {
        const idMatches = String(p.id) === String(prodId);
        const nameSlug = p.name ? generateSlug(p.name) : "";
        const slugMatches = nameSlug && nameSlug === prodId;
        const dashIndex = prodId.indexOf("-");
        let idFromDashMatches = false;
        if (dashIndex > 0) {
          const possibleId = prodId.substring(0, dashIndex);
          idFromDashMatches = String(p.id) === possibleId;
        }
        return idMatches || slugMatches || idFromDashMatches;
      });
      if (prod) {
        setSelectedProduct(prod);
      } else {
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }

    if (segments[0] === "admin") {
      setActiveTab("admin");
      
      const sub = segments[1];
      if (sub === "products") setAdminSection("products");
      else if (sub === "categories") setAdminSection("categories");
      else if (sub === "promos") setAdminSection("promos");
      else if (sub === "security") setAdminSection("security");
      else if (sub === "stock") setAdminSection("stock");
      else if (sub === "dashboard") setAdminSection("dashboard");
      else if (sub === "banner") setAdminSection("banner");
      else if (sub === "footer") setAdminSection("footer");
      else if (sub === "payments") setAdminSection("payments");
      else if (sub === "sales") setAdminSection("sales");
      else if (sub === "reviews") setAdminSection("reviews");
      else if (sub === "emails") {
        setAdminSection("emails");
        fetchEmailLogs();
      }
      else setAdminSection("dashboard");

      // Verify session token integrity on every URL change
      const token = localStorage.getItem("apex_admin_token");
      const loginTime = localStorage.getItem("apex_admin_login_time");
      const isExpired = loginTime && (Date.now() - Number(loginTime) > 3600000);
      
      if (token && !isExpired) {
        verifyAdminToken(token);
      } else {
        if (token || isExpired) {
          handleLogout();
        } else {
          setAuthToken(null);
        }
      }
      return;
    }

    setActiveTab("storefront");

    if (segments.length === 0) {
      setSelectedCategory("todos");
      setSelectedSubcategory("all");
      return;
    }

    const catPath = segments[0];
    const matchingCat = categoriesList.find(c => c.id === catPath);
    if (matchingCat) {
      setSelectedCategory(matchingCat.nombre);
      
      const subPath = segments[1];
      if (subPath) {
        const subcats = subcategoriesList.filter(s => s.categoria_id === matchingCat.id);
        const subcatExists = subcats.some(s => s.id === subPath) || subPath === "all";
        if (subcatExists) {
          setSelectedSubcategory(subPath);
        } else {
          setSelectedSubcategory("all");
        }
      } else {
        setSelectedSubcategory("all");
      }
    } else {
      setSelectedCategory("todos");
      setSelectedSubcategory("all");
    }
  };

  const navigateToProductRoute = (category: string, subcategory: string, showFlat: boolean = false) => {
    setSelectedProduct(null);
    setActiveTab("storefront");
    setSearchQuery("");
    if (category === "todos") {
      setOnlyInStock(false);
      setSortBy("featured");
      setShowAllProductsFlat(showFlat);
      setMobileLayoutMode("grid");
    } else {
      setShowAllProductsFlat(false);
      setMobileLayoutMode("list");
    }
    let path = "/";
    if (category !== "todos") {
      const catObj = store.dbCategories?.find(c => c.nombre === category || c.id === category);
      if (catObj) {
        path = `/${catObj.id}`;
        if (subcategory && subcategory !== "all") {
          path += `/${subcategory}`;
        }
      }
    }
    
    window.history.pushState(null, "", path);
    setSelectedCategory(category);
    setSelectedSubcategory(subcategory);
  };

  const getCatalogPath = () => {
    let path = "/";
    if (selectedCategory !== "todos") {
      const catObj = store.dbCategories?.find(c => c.nombre === selectedCategory || c.id === selectedCategory);
      if (catObj) {
        path = `/${catObj.id}`;
        if (selectedSubcategory && selectedSubcategory !== "all") {
          path += `/${selectedSubcategory}`;
        }
      }
    }
    return path;
  };
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Active product details view
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Added product popup modal tracking state
  const [addedItemModal, setAddedItemModal] = useState<{
    product: Product;
    quantity: number;
    size?: string;
    color?: string;
    isOpen: boolean;
  } | null>(null);

  // Authentication
  const [authToken, setAuthToken] = useState<string | null>(() => {
    const token = localStorage.getItem("apex_admin_token");
    if (!token) return null;
    
    let loginTime = localStorage.getItem("apex_admin_login_time");
    if (!loginTime) {
      loginTime = Date.now().toString();
      localStorage.setItem("apex_admin_login_time", loginTime);
    }
    
    const isExpired = Date.now() - Number(loginTime) > 3600000;
    if (isExpired) {
      localStorage.removeItem("apex_admin_token");
      localStorage.removeItem("apex_admin_login_time");
      return null;
    }
    
    return token;
  });
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Form states for Admin panel
  const [adminProductSearchQuery, setAdminProductSearchQuery] = useState("");
  const [adminProductCategoryFilter, setAdminProductCategoryFilter] = useState("all");
  const [adminProductStockFilter, setAdminProductStockFilter] = useState("all"); // 'all', 'instock', 'outofstock'
  const [adminProductStatusFilter, setAdminProductStatusFilter] = useState("all"); // 'all', 'active', 'paused'

  const [newProductStep, setNewProductStep] = useState(1);
  const [editingProductStep, setEditingProductStep] = useState(1);

  const updateProductCalculations = (p: Partial<Product>): Partial<Product> => {
    const pCompra = Number(p.precioCompra || 0);
    const pCon40 = Number((pCompra * 1.4).toFixed(2));
    const pVentaML = Number(p.precioVentaML || 0);
    const pComision = Number(p.comisionML || 0);
    const pWeb = Number((pVentaML - pComision).toFixed(2));
    const desc = Number(p.descuentoPorcentaje || 0);
    
    let sPinamar = Number(p.stockPinamar || 0);
    let sMontevideo = Number(p.stockMontevideo || 0);

    if (p.variants && p.variants.length > 0) {
      sPinamar = p.variants.reduce((sum, v) => sum + Number(v.stockPinamar || 0), 0);
      sMontevideo = p.variants.reduce((sum, v) => sum + Number(v.stockMontevideo || 0), 0);
    }
    
    const sTotal = sPinamar + sMontevideo;

    const computedPrice = desc > 0 ? Number((pWeb * (1 - desc / 100)).toFixed(2)) : pWeb;
    const computedOriginalPrice = desc > 0 ? pWeb : undefined;

    return {
      ...p,
      precioCon40: pCon40,
      precioWeb: pWeb,
      stockPinamar: sPinamar,
      stockMontevideo: sMontevideo,
      stockTotalActual: sTotal,
      stock: sTotal,
      price: computedPrice,
      originalPrice: computedOriginalPrice
    };
  };

  const prepareProductForEditing = (p: Product): Product => {
    const precioCompra = p.precioCompra !== undefined ? p.precioCompra : 0;
    const precioCon40 = p.precioCon40 !== undefined ? p.precioCon40 : Number((precioCompra * 1.4).toFixed(2));
    const comisionML = p.comisionML !== undefined ? p.comisionML : 0;
    const precioVentaML = p.precioVentaML !== undefined ? p.precioVentaML : (p.price || 0);
    const precioWeb = p.precioWeb !== undefined ? p.precioWeb : Number((precioVentaML - comisionML).toFixed(2));
    
    let descuentoPorcentaje = p.descuentoPorcentaje !== undefined ? p.descuentoPorcentaje : 0;
    if (descuentoPorcentaje === 0 && p.originalPrice && p.price && p.originalPrice > p.price) {
      descuentoPorcentaje = Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100);
    }

    const preparedVariants = p.variants ? p.variants.map(v => {
      const sp = v.stockPinamar !== undefined ? v.stockPinamar : v.stock;
      const sm = v.stockMontevideo !== undefined ? v.stockMontevideo : 0;
      return {
        ...v,
        stockPinamar: sp,
        stockMontevideo: sm,
        stock: sp + sm
      };
    }) : undefined;

    let stockPinamar = p.stockPinamar !== undefined ? p.stockPinamar : p.stock;
    let stockMontevideo = p.stockMontevideo !== undefined ? p.stockMontevideo : 0;
    if (preparedVariants && preparedVariants.length > 0) {
      stockPinamar = preparedVariants.reduce((sum, v) => sum + v.stockPinamar, 0);
      stockMontevideo = preparedVariants.reduce((sum, v) => sum + v.stockMontevideo, 0);
    }
    const stockTotalActual = stockPinamar + stockMontevideo;

    return {
      ...p,
      precioCompra,
      precioCon40,
      comisionML,
      precioVentaML,
      precioWeb,
      descuentoPorcentaje,
      stockPinamar,
      stockMontevideo,
      stockTotalActual,
      stock: stockTotalActual,
      variants: preparedVariants
    };
  };

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductMode, setIsNewProductMode] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    originalPrice: undefined,
    category: "",
    imageUrl: "",
    stock: 0,
    featured: false,
    consultOnly: false,
    categorias_adicionales: [],
    subcategorias_adicionales: [],
    precioCompra: 0,
    precioCon40: 0,
    comisionML: 0,
    precioVentaML: 0,
    precioWeb: 0,
    descuentoPorcentaje: 0,
    stockPinamar: 0,
    stockMontevideo: 0,
    stockTotalActual: 0
  });
  const [newProductErrors, setNewProductErrors] = useState<Record<string, string>>({});
  const [editProductErrors, setEditProductErrors] = useState<Record<string, string>>({});

  const [newSubSecCategoryFilter, setNewSubSecCategoryFilter] = useState<string>("");
  const [editSubSecCategoryFilter, setEditSubSecCategoryFilter] = useState<string>("");
  const [newVarSize, setNewVarSize] = useState<string>("Único");
  const [newVarColor, setNewVarColor] = useState<string>("General");
  const [editVarSize, setEditVarSize] = useState<string>("Único");
  const [editVarColor, setEditVarColor] = useState<string>("General");

  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("Shirt");
  const [newCategoryOrder, setNewCategoryOrder] = useState<number>(1);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState<number>(10);
  const [newCouponExpiration, setNewCouponExpiration] = useState("");

  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryParent, setNewSubcategoryParent] = useState("");
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [subToDeleteId, setSubToDeleteId] = useState<string | null>(null);
  const [adminToast, setAdminToast] = useState<{ text: string; type: "success" | "error" | "neutral" } | null>(null);

  const filteredAdminProducts = useMemo(() => {
    let filtered = store.products;

    if (adminProductCategoryFilter !== "all") {
      filtered = filtered.filter(p => p.categoria_id === adminProductCategoryFilter || p.categorias_adicionales?.includes(adminProductCategoryFilter));
    }

    if (adminProductStockFilter === "instock") {
      filtered = filtered.filter(p => {
        // If there are variants with stock, it might count. But p.stock has physical total.
        const st = p.stock ?? 0;
        return st > 0;
      });
    } else if (adminProductStockFilter === "outofstock") {
      filtered = filtered.filter(p => {
        const st = p.stock ?? 0;
        return st === 0;
      });
    }

    if (adminProductStatusFilter === "active") {
      filtered = filtered.filter(p => !p.paused);
    } else if (adminProductStatusFilter === "paused") {
      filtered = filtered.filter(p => !!p.paused);
    }

    if (!adminProductSearchQuery.trim()) return filtered;
    const q = adminProductSearchQuery.toLowerCase().trim();
    return filtered.filter(p => {
      const codeMatch = p.codigo ? p.codigo.toLowerCase().includes(q) : false;
      const nameMatch = !!p.name?.toLowerCase().includes(q);
      const categoryMatch = !!p.category?.toLowerCase().includes(q);
      const descMatch = !!p.description?.toLowerCase().includes(q);
      const additionalCatsMatch = !!p.categorias_adicionales?.some(catId => {
        const cat = (store.dbCategories || []).find(c => c.id === catId);
        return cat?.nombre?.toLowerCase().includes(q);
      });
      const subcatsMatch = !!(p.subcategoria_id && (store.dbSubcategories || []).find(s => s.id === p.subcategoria_id)?.nombre?.toLowerCase().includes(q));
      const additionalSubcatsMatch = !!p.subcategorias_adicionales?.some(subId => {
        const subcat = (store.dbSubcategories || []).find(s => s.id === subId);
        return subcat?.nombre?.toLowerCase().includes(q);
      });
      const variantsMatch = !!p.variants?.some(v => 
        (v.sku && v.sku.toLowerCase().includes(q)) || 
        (v.color && v.color.toLowerCase().includes(q)) || 
        (v.size && v.size.toLowerCase().includes(q))
      );
      return codeMatch || nameMatch || categoryMatch || descMatch || additionalCatsMatch || subcatsMatch || additionalSubcatsMatch || variantsMatch;
    });
  }, [
    store.products, 
    adminProductSearchQuery, 
    adminProductCategoryFilter, 
    adminProductStockFilter, 
    adminProductStatusFilter, 
    store.dbCategories, 
    store.dbSubcategories
  ]);

  const showAdminToast = (text: string, type: "success" | "error" | "neutral" = "success") => {
    setAdminToast({ text, type });
  };

  useEffect(() => {
    if (adminToast) {
      const timer = setTimeout(() => {
        setAdminToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [adminToast]);

  // Custom Modal/Dialog overlays for superior UX and iframe sandbox compatibility
  const [customAlert, setCustomAlert] = useState<{ title: string; message: string; show: boolean } | null>(null);
  const [customConfirm, setCustomConfirm] = useState<{
    title: string;
    message: string;
    show: boolean;
    onConfirm: () => void;
  } | null>(null);

  const showCustomAlert = (title: string, message: string) => {
    setCustomAlert({ title, message, show: true });
  };

  const showCustomConfirm = (title: string, message: string, onConfirm: () => void) => {
    setCustomConfirm({ title, message, show: true, onConfirm });
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    // Smooth scroll down to edit workspace forms
    setTimeout(() => {
      const element = document.getElementById("admin-categories-editor-form-row");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    }, 80);
  };

  const handleStartEditSubcategory = (sub: Subcategory) => {
    setEditingSubcategory(sub);
    // Smooth scroll down to edit workspace forms
    setTimeout(() => {
      const element = document.getElementById("admin-categories-editor-form-row");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        window.scrollTo({ top: 300, behavior: "smooth" });
      }
    }, 80);
  };

  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [emailLogsLoading, setEmailLogsLoading] = useState(false);

  const fetchEmailLogs = async () => {
    setEmailLogsLoading(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/admin/emails/logs", {
        headers: { "Authorization": `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setEmailLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Error fetching email logs", e);
    } finally {
      setEmailLogsLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress.trim()) {
      showAdminToast("Por favor, ingresa un destinatario válido.", "error");
      return;
    }
    setSendingTest(true);
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`
        },
        body: JSON.stringify({ 
          toEmail: testEmailAddress.trim(),
          smtpConfig: {
            emailSenderEnabled: editingSettings.emailSenderEnabled,
            emailSenderProvider: editingSettings.emailSenderProvider || "smtp",
            resendApiKey: editingSettings.resendApiKey,
            mailgunApiKey: editingSettings.mailgunApiKey,
            mailgunDomain: editingSettings.mailgunDomain,
            mailgunRegion: editingSettings.mailgunRegion,
            emailSenderSmtpHost: editingSettings.emailSenderSmtpHost,
            emailSenderSmtpPort: editingSettings.emailSenderSmtpPort,
            emailSenderSmtpUser: editingSettings.emailSenderSmtpUser,
            emailSenderSmtpPass: editingSettings.emailSenderSmtpPass,
            emailSenderFromAddress: editingSettings.emailSenderFromAddress,
            siteTitle: editingSettings.siteTitle
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.status === "simulated") {
          showAdminToast("¡Envío simulado correctamente! (Revisa el historial de correos abajo)", "success");
        } else {
          showAdminToast("¡Prueba de conexión SMTP ejecutada con éxito!", "success");
        }
        fetchEmailLogs();
      } else {
        showAdminToast(`Fallo: ${data.message}`, "error");
      }
    } catch (e: any) {
      showAdminToast("Error en la conexión con el servidor.", "error");
    } finally {
      setSendingTest(false);
    }
  };

  const handleClearEmailLogs = async () => {
    if (!confirm("¿Seguro que deseas vaciar el historial de correos?")) return;
    try {
      const activeToken = localStorage.getItem("apex_admin_token") || authToken;
      const res = await fetch("/api/admin/emails/logs", {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${activeToken}` }
      });
      const data = await res.json();
      if (data.success) {
        showAdminToast("Historial vaciado correctamente", "success");
        setEmailLogs([]);
      }
    } catch (e) {
      showAdminToast("Error al vaciar historial", "error");
    }
  };

  const [editingSettings, setEditingSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [emailPreviewTab, setEmailPreviewTab] = useState<'created' | 'changed'>('created');

  const [googlePlaceSearchQuery, setGooglePlaceSearchQuery] = useState("");
  const [googlePlaceSearchResults, setGooglePlaceSearchResults] = useState<any[]>([]);
  const [googlePlaceSearchLoading, setGooglePlaceSearchLoading] = useState(false);
  const [googlePlaceSearchError, setGooglePlaceSearchError] = useState("");

  // Fetch initial data and setup routing listeners
  useEffect(() => {
    fetchStoreData();
    parseRoute();
    // Load local cart if any
    let initialToken = null;
    let loginTime = null;
    let isExpired = false;

    try {
      const localCart = localStorage.getItem("apex_shop_cart");
      if (localCart) {
        setCart(JSON.parse(localCart));
      }
      
      // Dynamic Server Token verification on program startup with 1 hour limit check
      initialToken = localStorage.getItem("apex_admin_token");
      loginTime = localStorage.getItem("apex_admin_login_time");
      isExpired = !!(loginTime && (Date.now() - Number(loginTime) > 3600000));
    } catch (err) {
      console.warn("Storage reading is blocked or disabled: ", err);
    }
    
    if (initialToken && !isExpired) {
      verifyAdminToken(initialToken);
    } else if (initialToken || isExpired) {
      handleLogout();
    }

    const handlePopState = () => {
      parseRoute();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Real-time stock / background inventory automatic sync interval to prevent stale storefront stock counts
  useEffect(() => {
    // Poll the backend silently every 12 seconds to catch automatic inventory/ERP sync events
    const syncInterval = setInterval(() => {
      fetchStoreData(true);
    }, 12000);
    return () => clearInterval(syncInterval);
  }, []);

  // Active session expiration checker (forces redirect/logout after exactly 1 hour of session time)
  useEffect(() => {
    if (!authToken) return;

    const interval = setInterval(() => {
      const loginTime = localStorage.getItem("apex_admin_login_time");
      if (loginTime && Date.now() - Number(loginTime) > 3600000) {
        handleLogout();
        showAdminToast("Sesión de administrador expirada (límite de 1 hora excedido).", "error");
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [authToken]);

  // Click outside detector to close active dropdown menus cleanly
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".category-dropdown-container")) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  // Update scrolled state on scroll to add elegant shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Google Reviews OAuth postMessage response listener
  useEffect(() => {
    const handleGoogleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow AI Studio preview environment domains (*.run.app) or localhost
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const payload = event.data.payload;
        showAdminToast(`¡Sincronización Exitosa! Conectado como ${payload?.name || "Merchant Owner"}`, "success");
        // Trigger a complete refresh from the server to pull the newly authenticated state
        fetchStoreData();
      }
    };

    window.addEventListener("message", handleGoogleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleGoogleOAuthMessage);
    };
  }, []);

  // Synchronize and Initialize Google Analytics (GA4) dynamically based on admin settings
  useEffect(() => {
    const gaId = store.settings?.googleAnalyticsId;
    if (!gaId) return;

    // Check if running in sandboxed iframe or local dev, otherwise load dynamically
    let isDev = false;
    try {
      if (typeof window !== "undefined") {
        isDev = 
          window.self !== window.top || 
          window.location.hostname.includes("localhost") || 
          window.location.hostname.includes("127.0.0.1") ||
          window.location.hostname.includes("run.app") ||
          window.location.hostname.includes("google.com") ||
          window.location.hostname !== "ventas-juem.com";
      }
    } catch (e) {
      isDev = true;
    }
    if (isDev) {
      console.log("[Dev Target] Loaded GA4 ID '" + gaId + "' bypassed in preview context.");
      return;
    }

    // Check if script already exists to avoid redundant tags
    const scriptId = "google-analytics-script";
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script);

      const inlineScript = document.createElement("script");
      inlineScript.id = "google-analytics-inline";
      inlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${gaId}', { 'send_page_view': false });
      `;
      document.head.appendChild(inlineScript);
    } else {
      // Re-configure if ID changed
      if (typeof window !== "undefined" && (window as any).gtag) {
        (window as any).gtag('config', gaId, { 'send_page_view': false });
      }
    }
  }, [store.settings?.googleAnalyticsId]);

  // Synchronize and Initialize Google Tag Manager (GTM) dynamically based on admin settings
  useEffect(() => {
    const gtmId = store.settings?.googleTagManagerId;
    if (!gtmId) return;

    // Check if running in sandboxed iframe or local dev, otherwise load dynamically
    let isDev = false;
    try {
      if (typeof window !== "undefined") {
        isDev = 
          window.self !== window.top || 
          window.location.hostname.includes("localhost") || 
          window.location.hostname.includes("127.0.0.1") ||
          window.location.hostname.includes("run.app") ||
          window.location.hostname.includes("google.com") ||
          window.location.hostname !== "ventas-juem.com";
      }
    } catch (e) {
      isDev = true;
    }
    if (isDev) {
      console.log("[Dev Target] Loaded GTM ID '" + gtmId + "' bypassed in preview context.");
      return;
    }

    // Check if GTM script is already added
    const scriptId = "google-tag-manager-script";
    let script = document.getElementById(scriptId);

    if (!script) {
      const inlineScript = document.createElement("script");
      inlineScript.id = scriptId;
      inlineScript.innerHTML = `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${gtmId}');
      `;
      document.head.appendChild(inlineScript);

      const noscriptId = "google-tag-manager-noscript";
      let noscript = document.getElementById(noscriptId);
      if (!noscript) {
        noscript = document.createElement("noscript");
        noscript.id = noscriptId;
        noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
        document.body.insertBefore(noscript, document.body.firstChild);
      }
    }
  }, [store.settings?.googleTagManagerId]);

  // Synchronize and Initialize Meta Pixel (Facebook Pixel) dynamically based on admin settings
  useEffect(() => {
    const pixelId = store.settings?.metaPixelId;
    if (!pixelId) return;

    // Check if running in sandboxed iframe or local dev, otherwise load dynamically
    let isDev = false;
    try {
      if (typeof window !== "undefined") {
        isDev = 
          window.self !== window.top || 
          window.location.hostname.includes("localhost") || 
          window.location.hostname.includes("127.0.0.1") ||
          window.location.hostname.includes("run.app") ||
          window.location.hostname.includes("google.com") ||
          window.location.hostname !== "ventas-juem.com";
      }
    } catch (e) {
      isDev = true;
    }
    if (isDev) {
      console.log("[Dev Target] Loaded Meta Pixel '" + pixelId + "' bypassed in preview context.");
      return;
    }

    // Check if Meta Pixel script is already added
    const scriptId = "meta-pixel-script";
    let script = document.getElementById(scriptId);

    if (!script) {
      const inlineScript = document.createElement("script");
      inlineScript.id = scriptId;
      inlineScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(inlineScript);

      const noscriptId = "meta-pixel-noscript";
      let noscript = document.getElementById(noscriptId);
      if (!noscript) {
        noscript = document.createElement("noscript");
        noscript.id = noscriptId;
        noscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" />`;
        document.body.insertBefore(noscript, document.body.firstChild);
      }
    }
  }, [store.settings?.metaPixelId]);

  // Dynamic Meta Pixel Tracking based on navigational State changes
  useEffect(() => {
    const pixelId = store.settings?.metaPixelId;
    if (!pixelId || typeof window === "undefined" || !(window as any).fbq) return;

    try {
      // Track standard PageView on route changes
      (window as any).fbq('track', 'PageView');

      // Trigger automatic e-commerce InitiateCheckout when view changing to checkout
      if (activeTab === "checkout") {
        (window as any).fbq('track', 'InitiateCheckout', {
          content_ids: cart.map(c => c.product.id),
          content_type: 'product',
          value: cart.reduce((acc, c) => acc + (c.product.price * c.quantity), 0),
          currency: 'UYU'
        });
      }

      // Trigger Meta Pixel ViewContent event when viewing a product
      if (selectedProduct) {
        (window as any).fbq('track', 'ViewContent', {
          content_name: selectedProduct.name,
          content_ids: [selectedProduct.id],
          content_type: 'product',
          value: selectedProduct.price,
          currency: 'UYU'
        });
      }
    } catch (pixelError) {
      console.warn("Meta Pixel transition tracking error: ", pixelError);
    }
  }, [store.settings?.metaPixelId, activeTab, selectedProduct?.id]);

  // Dynamic GA4 Pageview & view_item Tracking based on navigational State changes
  useEffect(() => {
    const gaId = store.settings?.googleAnalyticsId;
    if (!gaId || typeof window === "undefined" || !(window as any).gtag) return;

    const baseTitle = store.settings.siteTitle || "Ventas Juem";
    const title = selectedProduct 
      ? `${selectedProduct.name} | ${baseTitle}`
      : activeTab === "admin" 
        ? `Consola de Administración | ${baseTitle}`
        : activeTab === "checkout"
          ? `Realizar Pedido / Carrito | ${baseTitle}`
          : baseTitle;

    const path = selectedProduct
      ? `/producto/${generateSlug(selectedProduct.name)}`
      : activeTab === "admin"
        ? "/admin"
        : activeTab === "checkout"
          ? "/checkout"
          : "/";

    try {
      (window as any).gtag('event', 'page_view', {
        page_title: title,
        page_location: window.location.href,
        page_path: path
      });

      // Trigger automatic e-commerce begin_checkout when view first changes to checkout
      if (activeTab === "checkout") {
        (window as any).gtag('event', 'begin_checkout', {
          currency: 'UYU',
          value: cart.reduce((acc, c) => acc + (c.product.price * c.quantity), 0),
          items: cart.map(c => ({
            item_id: c.product.id,
            item_name: c.product.name,
            price: c.product.price,
            item_variant: `${c.selectedSize || 'estándar'}-${c.selectedColor || 'único'}`,
            quantity: c.quantity
          }))
        });
      }

      // Trigger standard GA4 view_item event when looking at a product!
      if (selectedProduct) {
        (window as any).gtag('event', 'view_item', {
          currency: 'UYU',
          value: selectedProduct.price,
          items: [{
            item_id: selectedProduct.id,
            item_name: selectedProduct.name,
            price: selectedProduct.price,
            item_category: selectedProduct.category || "",
            quantity: 1
          }]
        });
      }
    } catch (gaError) {
      console.warn("GA transition tracking error: ", gaError);
    }
  }, [store.settings?.googleAnalyticsId, activeTab, selectedProduct?.id]);

  // Reset scroll to top when changing views/pages for a smooth user experience as requested by the user
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab, adminSection, selectedProduct?.id, selectedCategory, selectedSubcategory]);

  // Memoize top-bar slider dynamic slides for reactivity and performance
  const bannerSlides = useMemo(() => {
    const slides = [];
    const seenTexts = new Set<string>();

    if (store.settings.showPromotionBanner) {
      if (store.settings.promotionBannerText) {
        let text1 = store.settings.promotionBannerText.trim();
        const coupons = store.coupons || [];
        const isExpired = coupons.some((c) => {
          const code = String(c.code).trim().toUpperCase();
          if (!code) return false;
          const ended = c.expiration_date ? new Date(c.expiration_date).getTime() < Date.now() : false;
          const inactive = c.active === false;
          if (inactive || ended) {
            const escapedCode = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedCode}\\b`, 'i');
            return regex.test(text1);
          }
          return false;
        });
        if (isExpired) {
          text1 = "";
        }
        if (text1) {
          slides.push({
            id: "promo",
            text: text1,
            icon: <Tag className="h-3.5 w-3.5 inline shrink-0" />
          });
          seenTexts.add(text1);
        }
      }
      if (store.settings.promotionBannerText2) {
        let text2 = store.settings.promotionBannerText2.trim();
        const coupons = store.coupons || [];
        const isExpired = coupons.some((c) => {
          const code = String(c.code).trim().toUpperCase();
          if (!code) return false;
          const ended = c.expiration_date ? new Date(c.expiration_date).getTime() < Date.now() : false;
          const inactive = c.active === false;
          if (inactive || ended) {
            const escapedCode = code.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`\\b${escapedCode}\\b`, 'i');
            return regex.test(text2);
          }
          return false;
        });
        if (isExpired) {
          text2 = "";
        }
        if (text2 && !seenTexts.has(text2)) {
          slides.push({
            id: "promo2",
            text: text2,
            icon: <Tag className="h-3.5 w-3.5 inline shrink-0" />
          });
          seenTexts.add(text2);
        }
      }
    }
    if (store.settings.freeShippingActive !== false) {
      const minAmount = store.settings.freeShippingMinAmount !== undefined ? store.settings.freeShippingMinAmount : 2000;
      const regions = store.settings.freeShippingRegions || "Pinamar, Salinas, Marindia, Neptunia";
      const textShipping = `🎁 ¡Envío GRATIS en compras mayores de $${minAmount} para ${regions}! Elige tu de agencia favorita y nosotros lo cubrimos.`;
      
      if (!seenTexts.has(textShipping)) {
        slides.push({
          id: "shipping",
          text: textShipping,
          icon: <Truck className="h-4 w-4 inline shrink-0 text-emerald-300 animate-pulse" />
        });
        seenTexts.add(textShipping);
      }
    }
    return slides;
  }, [
    store.settings.showPromotionBanner,
    store.settings.promotionBannerText,
    store.settings.promotionBannerText2,
    store.settings.freeShippingActive,
    store.settings.freeShippingMinAmount,
    store.settings.freeShippingRegions,
    store.coupons
  ]);

  // Auto cycle top header slides every 5 seconds
  useEffect(() => {
    if (bannerSlides.length <= 1) {
      setCurrentBannerIdx(0);
      return;
    }
    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannerSlides.length]);

  const activeBannerIdx = currentBannerIdx >= bannerSlides.length ? 0 : currentBannerIdx;

  const bannerTransitionType = store.settings?.promotionBannerTransition || 'slide';
  const bannerAnimationProps = useMemo(() => {
    if (bannerTransitionType === 'fade') {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      };
    }
    if (bannerTransitionType === 'zoom') {
      return {
        initial: { opacity: 0, scale: 0.88 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.12 }
      };
    }
    // 'slide' (default)
    return {
      initial: { opacity: 0, y: 15 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -15 }
    };
  }, [bannerTransitionType]);

  const handlePrevBanner = () => {
    if (bannerSlides.length <= 1) return;
    setCurrentBannerIdx((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const handleNextBanner = () => {
    if (bannerSlides.length <= 1) return;
    setCurrentBannerIdx((prev) => (prev + 1) % bannerSlides.length);
  };

  // Collapse and close header search bar when clicking outside or pressing Escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const container = document.getElementById("header-search-container");
      if (container && !container.contains(event.target as Node)) {
        setIsHeaderSearchOpen(false);
        setShowSuggestions(false);
        setSearchQuery("");
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsHeaderSearchOpen(false);
        setShowSuggestions(false);
        setSearchQuery("");
      }
    }
    
    if (isHeaderSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHeaderSearchOpen]);

  // Dynamic Tab Title, Favicon, Meta Description, Categories and Canonical URL Synchronization based on admin settings & selected product
  useEffect(() => {
    if (!store.settings) return;

    // 1. Sync Document Title
    const baseTitle = store.settings.siteTitle || "Ventas Juem";
    const currentTitle = selectedProduct 
      ? `${selectedProduct.name} | ${baseTitle}`
      : baseTitle;
    document.title = currentTitle;

    // 2. Sync Meta Tags
    const setMetaTag = (id: string, attributeName: string, attributeValue: string, content: string) => {
      let meta = document.getElementById(id) || document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute(attributeName, attributeValue);
        if (id) meta.id = id;
        document.getElementsByTagName("head")[0].appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const currentDesc = selectedProduct
      ? (selectedProduct.description || "").substring(0, 160)
      : (store.settings.siteSubtitle || "Moda, tecnología y accesorios con envío a todo el país.");

    setMetaTag("seo-description", "name", "description", currentDesc);
    setMetaTag("og-title", "property", "og:title", currentTitle);
    setMetaTag("og-description", "property", "og:description", currentDesc);
    setMetaTag("twitter-title", "name", "twitter:title", currentTitle);
    setMetaTag("twitter-description", "name", "twitter:description", currentDesc);

    const currentImg = selectedProduct?.imageUrl || store.settings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
    setMetaTag("og-image", "property", "og:image", currentImg);
    setMetaTag("twitter-image", "name", "twitter:image", currentImg);

    // Sync Canonical
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.getElementsByTagName("head")[0].appendChild(canonical);
    }
    const currentUrl = selectedProduct 
      ? `${window.location.protocol}//${window.location.host}/producto/${generateSlug(selectedProduct.name)}`
      : `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    canonical.setAttribute("href", currentUrl);

    // 3. Sync Favicon Link
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.getElementsByTagName("head")[0].appendChild(link);
    }

    if (store.settings.logoType === "image" && store.settings.logoImageUrl) {
      link.href = store.settings.logoImageUrl;
    } else {
      // Create an elegant SVG-based Favicon automatically with the company's initials matching the primary theme color!
      const initials = (store.settings.logoText || "J").substring(0, 2).toUpperCase();
      const primaryColor = store.settings.primaryColor || "#D4A55A";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${primaryColor}"/><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="16">${initials}</text></svg>`;
      const base64Svg = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
      link.href = base64Svg;
    }
  }, [store.settings, selectedProduct]);

  const handleOpenProduct = (prod: Product) => {
    setSelectedProduct(prod);
    const newUrl = `/producto/${generateSlug(prod.name)}`;
    window.history.pushState(null, "", newUrl);
  };

  const fetchStoreData = async (isSilent: boolean = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch("/api/store");
      if (!res.ok) throw new Error("No se pudo obtener la configuración de la tienda");
      const data = (await res.json()) as ShopState;
      if (data && data.settings) {
        data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
      }
      setStore(data);
      setEditingSettings(data.settings);
      setNewCategoryOrder((data.dbCategories || []).length + 1);
      if (data.dbCategories && data.dbCategories.length > 0) {
        setNewSubcategoryParent(data.dbCategories[0].id);
      }
      
      // Skip route reset/auto-open detail page updates on background silent syncs to keep UI selection states pristine
      if (!isSilent) {
        parseRoute(data.dbCategories, data.products);
        
        // Auto-open product details page if path or query parameter is present
        const currentPath = window.location.pathname.toLowerCase().replace(/\/$/, "");
        const segments = currentPath.split("/").filter(Boolean);
        let prodId: string | null = null;
        if (segments[0] === "producto" && segments[1]) {
          prodId = segments[1];
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          prodId = urlParams.get("product");
        }
        if (prodId && data.products) {
          const prod = data.products.find(p => String(p.id) === String(prodId));
          if (prod) {
            setSelectedProduct(prod);
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      if (!isSilent) {
        setErrorMessage("No se pudo sincronizar con la base de datos.");
        setSyncStatus("error");
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Persist cart
  const saveCartToLocalStorage = (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      localStorage.setItem("apex_shop_cart", JSON.stringify(newCart));
    } catch (err) {
      console.warn("Storage writing is blocked or disabled: ", err);
    }
  };

  const getAvailableStockForProduct = (product: Product, size?: string, color?: string): number => {
    if (product.is3D) return 99; // Items 3D can be printed on-demand, maximum order is 99
    if (product.variants && product.variants.length > 0) {
      if (size && color) {
        const match = product.variants.find((v) => v.size === size && v.color === color);
        if (match) return match.stock;
      }
      if (size) {
        const match = product.variants.find((v) => v.size === size);
        if (match) return match.stock;
      }
      if (color) {
        const match = product.variants.find((v) => v.color === color);
        if (match) return match.stock;
      }
    }
    return product.stock !== undefined ? product.stock : 99;
  };

  const handleAddToCart = (product: Product, size?: string, color?: string, qty = 1) => {
    const existingIndex = cart.findIndex(
      (item) =>
        item.product.id === product.id &&
        item.selectedSize === size &&
        item.selectedColor === color
    );

    const availableStock = getAvailableStockForProduct(product, size, color);
    let newCart = [...cart];
    let qtyAdded = qty;

    if (existingIndex > -1) {
      const currentQty = newCart[existingIndex].quantity;
      if (currentQty + qty > availableStock) {
        qtyAdded = availableStock - currentQty;
        if (qtyAdded <= 0) {
          showAdminToast(`Stock límite alcanzado para este talle/color (${availableStock} un. máximo)`, "error");
          return;
        }
        newCart[existingIndex].quantity = availableStock;
        showAdminToast(`Se ajustó la cantidad al stock máximo de (${availableStock} un.)`, "neutral");
      } else {
        newCart[existingIndex].quantity += qty;
      }
    } else {
      if (qty > availableStock) {
        qtyAdded = availableStock;
        if (qtyAdded <= 0) {
          showAdminToast("Este artículo no tiene stock inmediato disponible.", "error");
          return;
        }
        showAdminToast(`Cantidad ajustada al stock disponible (${availableStock} un.)`, "neutral");
      }
      newCart.push({
        product,
        quantity: qtyAdded,
        selectedSize: size,
        selectedColor: color
      });
    }
    saveCartToLocalStorage(newCart);

    // Dynamic GA4 add_to_cart event tracking
    if (store.settings?.googleAnalyticsId && typeof window !== "undefined" && (window as any).gtag) {
      try {
        (window as any).gtag("event", "add_to_cart", {
          currency: "UYU",
          value: product.price * qtyAdded,
          items: [{
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            item_category: product.category || "",
            item_variant: `${size || "estándar"}-${color || "único"}`,
            quantity: qtyAdded
          }]
        });
      } catch (gaError) {
        console.warn("GA add_to_cart event error: ", gaError);
      }
    }

    // Dynamic Meta Pixel AddToCart tracking
    if (store.settings?.metaPixelId && typeof window !== "undefined" && (window as any).fbq) {
      try {
        (window as any).fbq('track', 'AddToCart', {
          content_name: product.name,
          content_ids: [product.id],
          content_type: 'product',
          value: product.price * qtyAdded,
          currency: 'UYU'
        });
      } catch (pixelError) {
        console.warn("Meta Pixel AddToCart error: ", pixelError);
      }
    }

    // Trigger the beautiful confirmation modal instead of just adding silently
    setAddedItemModal({
      product,
      quantity: qtyAdded,
      size,
      color,
      isOpen: true
    });
  };

  const handleUpdateQuantity = (productId: string, quantity: number, size?: string, color?: string) => {
    const newCart = cart.map((item) => {
      if (String(item.product.id) === String(productId) && item.selectedSize === size && item.selectedColor === color) {
        const liveProduct = store.products.find(p => String(p.id) === String(productId)) || item.product;
        const availableStock = getAvailableStockForProduct(liveProduct, size, color);
        if (quantity > availableStock) {
          showAdminToast(`Límite de stock alcanzado (${availableStock} un. disponibles)`, "neutral");
          return { ...item, product: liveProduct, quantity: availableStock };
        }
        return { ...item, product: liveProduct, quantity };
      }
      return item;
    });
    saveCartToLocalStorage(newCart);
  };

  const handleRemoveCartItem = (productId: string, size?: string, color?: string) => {
    const newCart = cart.filter(
      (item) =>
        !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)
    );
    saveCartToLocalStorage(newCart);
  };

  const handleClearCart = () => {
    saveCartToLocalStorage([]);
  };

  // Submit Admin Login
  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameInput, password: passwordInput })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuthToken(data.token);
        localStorage.setItem("apex_admin_token", data.token);
        localStorage.setItem("apex_admin_login_time", Date.now().toString());
        setIsLoginModalOpen(false);
        setActiveTab("admin");
        setUsernameInput("");
        setPasswordInput("");
        // Synchronize with active section subpath
        window.history.pushState(null, "", `/admin/${adminSection}`);
        showAdminToast("¡Sincronización de Sesión Establecida!", "success");
      } else {
        setLoginError(data.message || "Credenciales incorrectas.");
      }
    } catch (err) {
      setLoginError("Error de conexión al servidor de autenticación.");
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    localStorage.removeItem("apex_admin_token");
    localStorage.removeItem("apex_admin_login_time");
    setActiveTab("storefront");
    window.history.pushState(null, "", "/");
  };

  // Send whole storage state update to Server
  const saveStateToServer = async (updatedStore: ShopState): Promise<boolean> => {
    if (!authToken) return false;
    setSyncStatus("syncing");
    setSaving(true);
    try {
      const res = await fetch("/api/store", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify(updatedStore)
      });

      if (!res.ok) {
        if (res.status === 403) {
          handleLogout();
          throw new Error("Sesión vencida. Por favor, vuelve a iniciar sesión.");
        }
        throw new Error("No se pudo guardar la información en la base de datos.");
      }

      const resData = await res.json();
      if (resData.success && resData.state) {
        setStore(resData.state);
      } else {
        setStore(updatedStore);
      }
      setSyncStatus("synced");
      return true;
    } catch (err: any) {
      console.error(err);
      setSyncStatus("error");
      alert(err.message || "Error al sincronizar con el servidor. Por favor, reintenta.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const getNextAvailableSKUNumber = (products: Product[], additionalSkus: string[]): number => {
    let maxNum = 0;
    products.forEach(p => {
      if (p.codigo) {
        const match = p.codigo.trim().match(/^J(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      if (p.variants) {
        p.variants.forEach(v => {
          if (v.sku) {
            const match = v.sku.trim().match(/^J(\d+)/i);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxNum) maxNum = num;
            }
          }
        });
      }
    });
    additionalSkus.forEach(sku => {
      if (sku) {
        const match = sku.trim().match(/^J(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return maxNum === 0 ? 1 : maxNum + 1;
  };

  const getNextAutoSKU = (products: Product[]): string => {
    const nextNum = getNextAvailableSKUNumber(products, []);
    return `J${String(nextNum).padStart(3, '0')}`;
  };

  const checkDuplicateSKU = (product: Product, isNew: boolean): string | null => {
    const baseCode = product.codigo?.trim().toUpperCase();
    const otherProducts = isNew ? store.products : store.products.filter(p => String(p.id) !== String(product.id));
    
    // Map occupied codes with their owner's reference
    const occupied = new Map<string, string>();
    otherProducts.forEach(p => {
      const pCode = p.codigo?.trim().toUpperCase();
      if (pCode) {
        occupied.set(pCode, p.name);
      }
      if (p.variants) {
        p.variants.forEach(v => {
          const vSku = v.sku?.trim().toUpperCase();
          if (vSku) {
            occupied.set(vSku, `${p.name} (Variante: ${v.size !== "Único" ? v.size : ""} ${v.color !== "General" ? v.color : ""}`.trim() + ")");
          }
        });
      }
    });

    // 1. Check if product's main code duplicates other products
    if (baseCode && occupied.has(baseCode)) {
      return `El código único "${baseCode}" ya está en uso por el producto "${occupied.get(baseCode)}".`;
    }

    // 2. Check if product's variants duplicate other products
    if (product.variants) {
      for (const v of product.variants) {
        const vSku = v.sku?.trim().toUpperCase();
        if (vSku && occupied.has(vSku)) {
          return `El código de variante "${vSku}" ya está en uso por el producto "${occupied.get(vSku)}".`;
        }
      }
    }

    // 3. Check internal duplicates (within the current product's variants list)
    const selfVariantSKUs = new Set<string>();

    if (product.variants) {
      for (const v of product.variants) {
        const vSku = v.sku?.trim().toUpperCase();
        if (vSku) {
          if (selfVariantSKUs.has(vSku)) {
            return `Código de variante duplicado "${vSku}" detectado en múltiples variantes de este producto.`;
          }
          selfVariantSKUs.add(vSku);
        }
      }
    }

    return null;
  };

  // CRUD handlers - Products
  const handleCreateProduct = async (e?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    const errors: Record<string, string> = {};

    if (!newProduct.name || !newProduct.name.trim()) {
      errors.name = "El nombre del producto es obligatorio.";
    }
    
    // Category validation
    let actualCategory = "Otros";
    let actualCategoryId = "";
    if (newProduct.categoria_id) {
      const match = (store.dbCategories || []).find(c => c.id === newProduct.categoria_id);
      if (match) {
        actualCategory = match.nombre;
        actualCategoryId = match.id;
      }
    } else {
      const firstCat = (store.dbCategories || [])[0];
      if (firstCat) {
        actualCategory = firstCat.nombre;
        actualCategoryId = firstCat.id;
      }
    }

    if (!actualCategoryId) {
      errors.category = "Debes seleccionar o crear una categoría primero.";
    }

    // SKU/Código validation
    if (!newProduct.codigo || !newProduct.codigo.trim()) {
      errors.codigo = "El Código Único / SKU Base es obligatorio.";
    }

    // Price validation
    if (newProduct.price === undefined || isNaN(newProduct.price)) {
      errors.price = "El precio de venta es obligatorio.";
    } else if (newProduct.price <= 0) {
      errors.price = "El precio debe ser un número mayor a 0.";
    }

    // Stock validation
    if (newProduct.stock === undefined || isNaN(newProduct.stock)) {
      errors.stock = "El stock físico es obligatorio.";
    } else if (newProduct.stock < 0) {
      errors.stock = "El stock no puede ser un número negativo.";
    }

    if (Object.keys(errors).length > 0) {
      setNewProductErrors(errors);
      // Wait for a tick and scroll to errors if possible
      return;
    }

    // Clear any previous error
    setNewProductErrors({});

    const created: Product = {
      id: "prod-" + Date.now(),
      codigo: newProduct.codigo || "",
      name: newProduct.name!.trim(),
      description: newProduct.description || "",
      price: Number(newProduct.price || 0),
      originalPrice: newProduct.originalPrice ? Number(newProduct.originalPrice) : undefined,
      category: actualCategory,
      categoria_id: actualCategoryId,
      subcategoria_id: newProduct.subcategoria_id || "all",
      categorias_adicionales: newProduct.categorias_adicionales || [],
      subcategorias_adicionales: newProduct.subcategorias_adicionales || [],
      imageUrl: newProduct.imageUrl || "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80",
      stock: Math.floor(Number(newProduct.stock ?? 0)),
      featured: !!newProduct.featured,
      is3D: !!newProduct.is3D,
      hoursPerUnit: newProduct.hoursPerUnit,
      consultOnly: !!newProduct.consultOnly,
      createdAt: new Date().toISOString(),
      sizes: newProduct.sizes || [],
      colors: newProduct.colors || [],
      variants: newProduct.variants || [],
      imagenes: newProduct.imagenes || [],
      
      // Custom internal pricing and branch stock fields
      precioCompra: Number(newProduct.precioCompra || 0),
      precioCon40: Number(newProduct.precioCon40 || 0),
      comisionML: Number(newProduct.comisionML || 0),
      precioVentaML: Number(newProduct.precioVentaML || 0),
      precioWeb: Number(newProduct.precioWeb || 0),
      descuentoPorcentaje: Number(newProduct.descuentoPorcentaje || 0),
      stockPinamar: Number(newProduct.stockPinamar || 0),
      stockMontevideo: Number(newProduct.stockMontevideo || 0),
      stockTotalActual: Number(newProduct.stockTotalActual || 0),

      sizeChartEnabled: newProduct.sizeChartEnabled !== false,
      sizeChartShowSuperior: newProduct.sizeChartShowSuperior !== false,
      sizeChartShowInferior: newProduct.sizeChartShowInferior !== false,
      sizeChartShowCalzado: newProduct.sizeChartShowCalzado !== false,
      sizeChartShowRecommender: newProduct.sizeChartShowRecommender !== false,
      sizeChartData: newProduct.sizeChartData || {
        columns: ["Talle", "Sisa / Ancho (cm)", "Largo Total (cm)"],
        rows: []
      }
    };

    // Validate unique SKU/codigo
    const skuConflict = checkDuplicateSKU(created, true);
    if (skuConflict) {
      showAdminToast(skuConflict, "error");
      setNewProductErrors({ codigo: skuConflict });
      return;
    }

    const updatedProducts = [created, ...store.products];
    const updatedState = { ...store, products: updatedProducts };
    
    const success = await saveStateToServer(updatedState);
    if (success) {
      showAdminToast("¡Producto creado con éxito! 🚀", "success");
      setIsNewProductMode(false);
      
      // Reset form
      setNewProduct({
        codigo: getNextAutoSKU(updatedState.products),
        name: "",
        description: "",
        price: 0,
        originalPrice: undefined,
        category: (store.dbCategories || [])[0]?.nombre || "",
        categoria_id: (store.dbCategories || [])[0]?.id || "",
        subcategoria_id: "all",
        categorias_adicionales: [],
        subcategorias_adicionales: [],
        imageUrl: "",
        stock: 0,
        featured: false,
        consultOnly: false,
        sizes: [],
        colors: [],
        variants: [],
        imagenes: [],
        precioCompra: 0,
        precioCon40: 0,
        comisionML: 0,
        precioVentaML: 0,
        precioWeb: 0,
        descuentoPorcentaje: 0,
        stockPinamar: 0,
        stockMontevideo: 0,
        stockTotalActual: 0
      });
    } else {
      showAdminToast("Error al guardar el nuevo producto.", "error");
    }
  };

  const handleUpdateProduct = async (e?: any) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!editingProduct) return;

    if (!editingProduct.name || !editingProduct.name.trim()) {
      showAdminToast("El nombre del producto es obligatorio.", "error");
      return;
    }

    if (!editingProduct.codigo || !editingProduct.codigo.trim()) {
      showAdminToast("El Código Único / SKU Base es obligatorio.", "error");
      return;
    }

    // Validate unique SKU/codigo
    const skuConflict = checkDuplicateSKU(editingProduct, false);
    if (skuConflict) {
      showAdminToast(skuConflict, "error");
      return;
    }

    const updatedProducts = store.products.map((p) => {
      if (String(p.id) === String(editingProduct.id)) {
        return editingProduct;
      }
      return p;
    });

    const updatedState = { ...store, products: updatedProducts };
    const success = await saveStateToServer(updatedState);
    if (success) {
      showAdminToast("¡Modificaciones guardadas correctamente! 💾", "success");
      setEditingProduct(null);
    } else {
      showAdminToast("Error al guardar las modificaciones del producto.", "error");
    }
  };

  const handleDeleteProduct = (productId: string | number) => {
    showCustomConfirm(
      "Eliminar Producto",
      "¿Estás seguro de que deseas eliminar este producto?",
      async () => {
        const updatedProducts = store.products.filter((p) => String(p.id) !== String(productId));
        const updatedState = { ...store, products: updatedProducts };
        
        // Optimistic UI update for instant feedback
        setStore(updatedState);
        
        const success = await saveStateToServer(updatedState);
        if (success) {
          showAdminToast("¡Producto eliminado correctamente! 🗑️", "success");
        } else {
          showAdminToast("Error al persistir la eliminación en el servidor.", "error");
        }
      }
    );
  };

  const handleTogglePause = async (productId: string | number) => {
    const updatedProducts = store.products.map((p) => {
      if (String(p.id) === String(productId)) {
        return { ...p, paused: !p.paused };
      }
      return p;
    });
    const updatedState = { ...store, products: updatedProducts };
    const success = await saveStateToServer(updatedState);
    if (success) {
      showAdminToast("Estado de pausa actualizado correctamente.", "success");
    }
  };

  const handleQuickUpdateStock = async (productId: string | number, newStock: number) => {
    const updatedProducts = store.products.map((p) => {
      if (String(p.id) === String(productId)) {
        return { ...p, stock: Math.max(0, newStock) };
      }
      return p;
    });
    const updatedState = { ...store, products: updatedProducts };
    const success = await saveStateToServer(updatedState);
    if (success) {
      showAdminToast("Stock rápido actualizado con éxito.", "success");
    }
  };

  const handleSaveLowStockThreshold = (newThreshold: number) => {
    const updatedSettings = { ...store.settings, lowStockThreshold: newThreshold };
    const updatedState = { ...store, settings: updatedSettings };
    saveStateToServer(updatedState);
    setEditingSettings(updatedSettings);
    showAdminToast(`Límite de stock bajo configurado: ${newThreshold} unidades.`, "success");
  };

  const handleUpdateStockItem = async (item: any, field: string, value: any) => {
    const updatedProducts = store.products.map(p => {
      if (p.id !== item.productId) return p;

      const updatedProduct = { ...p };

      if (item.isVariant) {
        updatedProduct.variants = (updatedProduct.variants || []).map(v => {
          if (v.id !== item.variantId && v.sku !== item.sku) return v;
          const updatedVariant = { ...v };

          if (field === "stockMontevideo") {
            updatedVariant.stockMontevideo = Math.max(0, parseInt(value) || 0);
            updatedVariant.stock = (updatedVariant.stockMontevideo || 0) + (updatedVariant.stockPinamar || 0);
          } else if (field === "stockPinamar") {
            updatedVariant.stockPinamar = Math.max(0, parseInt(value) || 0);
            updatedVariant.stock = (updatedVariant.stockMontevideo || 0) + (updatedVariant.stockPinamar || 0);
          } else if (field === "price") {
            updatedVariant.price = Math.max(0, parseFloat(value) || 0);
          }
          return updatedVariant;
        });

        // Sum up stocks for the product
        updatedProduct.stockMontevideo = (updatedProduct.variants || []).reduce((sum, v) => sum + (v.stockMontevideo || 0), 0);
        updatedProduct.stockPinamar = (updatedProduct.variants || []).reduce((sum, v) => sum + (v.stockPinamar || 0), 0);
        updatedProduct.stock = (updatedProduct.variants || []).reduce((sum, v) => sum + (v.stock || 0), 0);

        if (field === "precioCompra") {
          updatedProduct.precioCompra = Math.max(0, parseFloat(value) || 0);
        } else if (field === "precioVentaML") {
          updatedProduct.precioVentaML = Math.max(0, parseFloat(value) || 0);
        } else if (field === "comisionML") {
          updatedProduct.comisionML = Math.max(0, parseFloat(value) || 0);
        }
      } else {
        if (field === "stockMontevideo") {
          updatedProduct.stockMontevideo = Math.max(0, parseInt(value) || 0);
          updatedProduct.stock = (updatedProduct.stockMontevideo || 0) + (updatedProduct.stockPinamar || 0);
        } else if (field === "stockPinamar") {
          updatedProduct.stockPinamar = Math.max(0, parseInt(value) || 0);
          updatedProduct.stock = (updatedProduct.stockMontevideo || 0) + (updatedProduct.stockPinamar || 0);
        } else if (field === "precioCompra") {
          updatedProduct.precioCompra = Math.max(0, parseFloat(value) || 0);
        } else if (field === "price") {
          updatedProduct.price = Math.max(0, parseFloat(value) || 0);
        } else if (field === "precioVentaML") {
          updatedProduct.precioVentaML = Math.max(0, parseFloat(value) || 0);
        } else if (field === "comisionML") {
          updatedProduct.comisionML = Math.max(0, parseFloat(value) || 0);
        }
      }

      return updatedProduct;
    });

    const updatedState = { ...store, products: updatedProducts };
    setStore(updatedState);
    await saveStateToServer(updatedState);
  };

  // CRUD handlers - Coupons
  const handleGenerateRandomCouponCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const prefixes = ["JUEM", "DESCUENTO", "PROMO", "SALE", "COUPON", "UYU", "REGALO"];
    const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    let randomSuffix = "";
    for (let i = 0; i < 4; i++) {
      randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const code = `${randomPrefix}${randomSuffix}`;
    setNewCouponCode(code);
    showAdminToast(`Código generado: ${code}`, "success");
  };

  const handleAddCoupon = (e: FormEvent) => {
    e.preventDefault();
    const code = newCouponCode.trim().toUpperCase();
    if (!code) {
      showAdminToast("El código del cupón es obligatorio", "error");
      return;
    }
    if (newCouponDiscount <= 0 || newCouponDiscount > 100) {
      showAdminToast("El porcentaje de descuento debe estar entre 1 y 100", "error");
      return;
    }

    const exists = (store.coupons || []).some(c => c.code.toUpperCase() === code);
    if (exists) {
      showAdminToast("Este código de cupón ya existe", "error");
      return;
    }

    const newC = {
      code,
      discount_percent: Number(newCouponDiscount),
      expiration_date: newCouponExpiration ? new Date(newCouponExpiration).toISOString() : undefined,
      active: true
    };

    const updatedCoupons = [...(store.coupons || []), newC];
    const updatedState = { ...store, coupons: updatedCoupons };
    saveStateToServer(updatedState);
    setNewCouponCode("");
    setNewCouponDiscount(10);
    setNewCouponExpiration("");
    showAdminToast("¡Cupón agregado con éxito!", "success");
  };

  const handleDeleteCoupon = (code: string) => {
    showCustomConfirm(
      "Eliminar Cupón",
      `¿Estás seguro de que deseas eliminar el cupón ${code}?`,
      () => {
        const updatedCoupons = (store.coupons || []).filter(c => c.code !== code);
        const updatedState = { ...store, coupons: updatedCoupons };
        saveStateToServer(updatedState);
        showAdminToast("¡Cupón eliminado correctamente!", "success");
      }
    );
  };

  // CRUD handlers - Categories & Subcategories
  const handleAddCategory = (e: FormEvent) => {
    e.preventDefault();
    const nombre = newCategoryName.trim();
    if (!nombre) return;
    
    // Create URL-safe semantic category ID slug
    const id = nombre.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
      
    if (!id) {
      showCustomAlert("Error de Categoría", "Nombre de categoría no válido.");
      return;
    }

    const exists = (store.dbCategories || []).some(c => c.id === id || c.nombre.toLowerCase() === nombre.toLowerCase());
    if (exists) {
      showCustomAlert("Categoría Existente", "Esta categoría principal ya existe.");
      return;
    }

    const newCat: Category = {
      id,
      nombre,
      icono: newCategoryIcon,
      orden: Number(newCategoryOrder) || ((store.dbCategories || []).length + 1),
      active: true
    };

    const updatedDbCategories = [...(store.dbCategories || []), newCat];
    const updatedCategories = [...store.categories, nombre];

    const updatedState = { 
      ...store, 
      categories: updatedCategories,
      dbCategories: updatedDbCategories 
    };

    saveStateToServer(updatedState);
    setNewCategoryName("");
    setNewCategoryIcon("Shirt");
    setNewCategoryOrder((store.dbCategories || []).length + 2);
  };

  const handleUpdateDynamicCategory = (e: FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    const nombre = editingCategory.nombre.trim();
    if (!nombre) return;

    const updatedDbCategories = (store.dbCategories || []).map(c => {
      if (c.id === editingCategory.id) {
        return editingCategory;
      }
      return c;
    });

    const oldCatName = (store.dbCategories || []).find(c => c.id === editingCategory.id)?.nombre || "";
    const updatedCategories = store.categories.map(c => c === oldCatName ? nombre : c);

    const updatedProducts = store.products.map(p => {
      if (p.categoria_id === editingCategory.id || p.category === oldCatName) {
        return { ...p, category: nombre, categoria_id: editingCategory.id };
      }
      return p;
    });

    const updatedState = {
      ...store,
      products: updatedProducts,
      categories: updatedCategories,
      dbCategories: updatedDbCategories
    };

    saveStateToServer(updatedState);
    setEditingCategory(null);
  };

  const handleDeleteCategory = (catIdOrName: string) => {
    // Handle both dynamic ID deletion and fallback name matching
    const catObj = (store.dbCategories || []).find(c => c.id === catIdOrName || c.nombre === catIdOrName);
    const catId = catObj ? catObj.id : catIdOrName;
    const catName = catObj ? catObj.nombre : catIdOrName;

    const assignedProducts = store.products.filter(p => 
      p.categoria_id === catId || 
      p.category === catName ||
      (p.categorias_adicionales && p.categorias_adicionales.includes(catId))
    );
    const hasProducts = assignedProducts.length > 0;

    // We'll also find any subcategories of this category that will be deleted
    const subcatsToDelete = (store.dbSubcategories || []).filter(s => s.categoria_id === catId);
    const subcatIds = subcatsToDelete.map(s => s.id);

    let confirmMsg = `¿Estás seguro de que deseas eliminar la categoría "${catName}"? Esto eliminará también todas sus subcategorías asociadas de forma irreversible.`;
    if (hasProducts) {
      confirmMsg = `La categoría "${catName}" tiene ${assignedProducts.length} producto(s) asignado(s). Si la eliminas, estos productos se desvincularán automáticamente de esta categoría y de sus subcategorías asociadas. ¿Deseas continuar?`;
    }

    showCustomConfirm(
      "Eliminar Categoría",
      confirmMsg,
      () => {
        // Disassociate products from this category and its deleted subcategories
        const updatedProducts = store.products.map(p => {
          let updated = { ...p };
          let changed = false;

          // Main category
          if (p.categoria_id === catId || p.category === catName) {
            updated.categoria_id = "";
            updated.category = "";
            changed = true;
          }

          // Additional categories array
          if (p.categorias_adicionales && p.categorias_adicionales.includes(catId)) {
            updated.categorias_adicionales = p.categorias_adicionales.filter(id => id !== catId);
            changed = true;
          }

          // Main subcategory
          if (p.subcategoria_id && subcatIds.includes(p.subcategoria_id)) {
            updated.subcategoria_id = "all";
            changed = true;
          }

          // Additional subcategories array
          if (p.subcategorias_adicionales && p.subcategorias_adicionales.some(id => subcatIds.includes(id))) {
            updated.subcategorias_adicionales = p.subcategorias_adicionales.filter(id => !subcatIds.includes(id));
            changed = true;
          }

          return changed ? updated : p;
        });

        const updatedDbCategories = (store.dbCategories || []).filter(c => c.id !== catId);
        const updatedDbSubcategories = (store.dbSubcategories || []).filter(s => s.categoria_id !== catId);
        const updatedCategories = store.categories.filter(c => c !== catName);

        const updatedState = {
          ...store,
          products: updatedProducts,
          categories: updatedCategories,
          dbCategories: updatedDbCategories,
          dbSubcategories: updatedDbSubcategories
        };

        saveStateToServer(updatedState);
        showAdminToast("¡Categoría y subcategorías asociadas eliminadas correctamente!", "success");
      }
    );
  };

  const handleReorderCategory = (catId: string, direction: "up" | "down") => {
    const cats = [...(store.dbCategories || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const index = cats.findIndex(c => c.id === catId);
    if (index === -1) return;

    if (direction === "up" && index > 0) {
      const temp = cats[index].orden;
      cats[index].orden = cats[index - 1].orden;
      cats[index - 1].orden = temp;
    } else if (direction === "down" && index < cats.length - 1) {
      const temp = cats[index].orden;
      cats[index].orden = cats[index + 1].orden;
      cats[index + 1].orden = temp;
    }

    const remapped = cats.map((c, i) => ({ ...c, orden: i + 1 }));

    saveStateToServer({
      ...store,
      dbCategories: remapped
    });
  };

  // CRUD handlers - Subcategories
  const handleCreateSubcategory = (e: FormEvent) => {
    e.preventDefault();
    const nombre = newSubcategoryName.trim();
    if (!nombre) return;
    if (!newSubcategoryParent) {
      showCustomAlert("Falta Categoría", "Por favor selecciona una categoría principal para esta subcategoría.");
      return;
    }

    const id = nombre.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (!id) {
      showCustomAlert("Error de Subcategoría", "Nombre de subcategoría no válido.");
      return;
    }

    const exists = (store.dbSubcategories || []).some(s => s.categoria_id === newSubcategoryParent && (s.id === id || s.nombre.toLowerCase() === nombre.toLowerCase()));
    if (exists) {
      showCustomAlert("Subcategoría Existente", "Esta subcategoría ya existe en la categoría seleccionada.");
      return;
    }

    const newSub: Subcategory = {
      id,
      nombre,
      categoria_id: newSubcategoryParent
    };

    const updatedDbSubcategories = [...(store.dbSubcategories || []), newSub];
    const updatedState = { ...store, dbSubcategories: updatedDbSubcategories };
    saveStateToServer(updatedState);
    setNewSubcategoryName("");
    showAdminToast("¡Subcategoría creada con éxito!", "success");
  };

  const handleUpdateSubcategory = (e: FormEvent) => {
    e.preventDefault();
    if (!editingSubcategory) return;
    
    const nombre = editingSubcategory.nombre.trim();
    if (!nombre) return;

    const updatedDbSubcategories = (store.dbSubcategories || []).map(s => {
      if (s.id === editingSubcategory.id) {
        return editingSubcategory;
      }
      return s;
    });

    const updatedState = { ...store, dbSubcategories: updatedDbSubcategories };
    saveStateToServer(updatedState);
    setEditingSubcategory(null);
    showAdminToast("¡Subcategoría modificada con éxito!", "success");
  };

  const handleDeleteSubcategory = (subId: string) => {
    const subObj = (store.dbSubcategories || []).find(s => s.id === subId);
    const subName = subObj ? subObj.nombre : subId;

    const assignedProducts = store.products.filter(p => 
      p.subcategoria_id === subId ||
      (p.subcategorias_adicionales && p.subcategorias_adicionales.includes(subId))
    );
    const hasProducts = assignedProducts.length > 0;

    let confirmMsg = `¿Estás seguro de que deseas eliminar la subcategoría "${subName}"?`;
    if (hasProducts) {
      confirmMsg = `La subcategoría "${subName}" tiene ${assignedProducts.length} producto(s) asignado(s). Si la eliminas, estos productos se desvincularán automáticamente de esta subcategoría. ¿Deseas continuar?`;
    }

    showCustomConfirm("Eliminar Subcategoría", confirmMsg, () => {
      // Disassociate products
      const updatedProducts = store.products.map(p => {
        let updated = { ...p };
        let changed = false;

        if (p.subcategoria_id === subId) {
          updated.subcategoria_id = "all";
          changed = true;
        }

        if (p.subcategorias_adicionales && p.subcategorias_adicionales.includes(subId)) {
          updated.subcategorias_adicionales = p.subcategorias_adicionales.filter(id => id !== subId);
          changed = true;
        }

        return changed ? updated : p;
      });

      const updatedDbSubcategories = (store.dbSubcategories || []).filter(s => s.id !== subId);
      const updatedState = { 
        ...store, 
        products: updatedProducts, 
        dbSubcategories: updatedDbSubcategories 
      };
      saveStateToServer(updatedState);
      showAdminToast("¡Subcategoría eliminada correctamente!", "success");
    });
  };

  // Save Settings Changes (Design, titles, colors, WhatsApp)
  const handleSaveSettings = () => {
    const updatedState = { ...store, settings: editingSettings };
    saveStateToServer(updatedState);
    showAdminToast("¡Todos los ajustes se han guardado con éxito! 💾", "success");
  };

  // Google OAuth popup flow initiator
  const handleGoogleConnect = async () => {
    try {
      const res = await fetch("/api/auth/google-reviews/url");
      if (!res.ok) {
        showAdminToast("Fallo al obtener la ruta de Google de tu servidor.", "error");
        return;
      }
      const { url } = await res.json();
      
      const authWindow = window.open(
        url,
        "google_oauth_popup",
        "width=580,height=720,status=no,resizable=yes,scrollbars=yes"
      );

      if (!authWindow) {
        showAdminToast("⚠️ Ventana emergente bloqueada. Por favor, habilita las ventanas emergentes en tu navegador para conectar Tu Comercio.", "error");
      }
    } catch (err) {
      console.error("Error initiating Google OAuth workflow:", err);
      showAdminToast("Ocurrió un error al contactar al servidor de autenticación Google.", "error");
    }
  };

  // Google Place Search from official Google Maps Finder
  const handleSearchGooglePlace = async () => {
    if (!googlePlaceSearchQuery.trim()) {
      setGooglePlaceSearchError("Por favor ingresa el nombre de tu negocio para buscarlo.");
      return;
    }
    setGooglePlaceSearchLoading(true);
    setGooglePlaceSearchError("");
    setGooglePlaceSearchResults([]);
    try {
      const res = await fetch(`/api/google-places/search?query=${encodeURIComponent(googlePlaceSearchQuery)}`);
      if (!res.ok) {
        throw new Error("Respuesta de servidor inválida al buscar el local.");
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        setGooglePlaceSearchResults(data.results);
        if (data.results.length === 0) {
          setGooglePlaceSearchError("No se encontraron coincidencias para este comercio.");
        }
      } else {
        setGooglePlaceSearchError(data.message || "Error al buscar el local en Google Maps.");
      }
    } catch (err: any) {
      console.error("Error searching Google Place ID:", err);
      setGooglePlaceSearchError("Ocurrió un error de conexión al buscar en Google Maps. Asegúrate de configurar la Clave API de Google Places primero.");
    } finally {
      setGooglePlaceSearchLoading(false);
    }
  };

  // Image Helper templates
  const UNSPLASH_TEMPLATES = [
    { title: "Ropa / Moda 1", url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80" },
    { title: "Ropa / Moda 2", url: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80" },
    { title: "Electrónica 1", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=80" },
    { title: "Electrónica 2", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=800&q=80" },
    { title: "Accesorios 1", url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80" },
    { title: "Accesorios 2", url: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80" }
  ];

  // Business Stock Alerts Logic
  const lowStockThresholdSetting = typeof store.settings?.lowStockThreshold === 'number' ? store.settings.lowStockThreshold : 5;
  const outOfStockProducts = store.products.filter(p => p.active !== false && p.stock <= 0);
  const lowStockProducts = store.products.filter(p => p.active !== false && p.stock > 0 && p.stock <= lowStockThresholdSetting);
  const totalStockAlerts = outOfStockProducts.length + lowStockProducts.length;

  // Filtering products for listing
  const filteredProducts = store.products.filter((p) => {
    if (p.paused || p.active === false) return false;
    
    let matchesSearch = true;
    if (searchQuery.trim().length > 0) {
      matchesSearch = calculateRelevance(p, searchQuery, store.dbCategories, store.dbSubcategories) > 0;
    }
    
    let matchesCategory = true;
    if (selectedCategory !== "todos") {
      const catObj = (store.dbCategories || []).find(
        (c) => c.nombre.toLowerCase() === selectedCategory.toLowerCase() || c.id === selectedCategory.toLowerCase()
      );
      const catId = catObj ? catObj.id : "";
      
      const isMainCatMatch = (p.categoria_id && catId && p.categoria_id === catId) || 
                             (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());
      
      const isAdditionalCatMatch = !!(p.categorias_adicionales && catId && p.categorias_adicionales.includes(catId));
      const hasCatMatch = isMainCatMatch || isAdditionalCatMatch;
      
      if (!hasCatMatch) {
         matchesCategory = false;
      } else if (selectedSubcategory && selectedSubcategory !== "all") {
        const isMainSubMatch = p.subcategoria_id && p.subcategoria_id === selectedSubcategory;
        const isAdditionalSubMatch = !!(p.subcategorias_adicionales && p.subcategorias_adicionales.includes(selectedSubcategory));
        
        if (isMainSubMatch || isAdditionalSubMatch) {
          matchesCategory = true;
        } else if (p.subcategoria_id && p.subcategoria_id !== "all") {
          matchesCategory = false;
        } else {
          // Fallback to keyword search for backward compatibility
          const keywords = SUBCATEGORY_KEYWORDS[selectedSubcategory] || [];
          if (keywords.length > 0) {
            const textToSearch = (p.name + " " + p.description).toLowerCase();
            const matchesKeyword = keywords.some(kw => textToSearch.includes(kw));
            matchesCategory = matchesKeyword;
          } else {
            // Unrecognized subcategory identifier fallback matching by checking strings
            const subcatObj = (store.dbSubcategories || []).find(s => s.id === selectedSubcategory);
            const subName = subcatObj ? subcatObj.nombre.toLowerCase() : selectedSubcategory.toLowerCase();
            const textToSearch = (p.name + " " + p.description).toLowerCase();
            matchesCategory = textToSearch.includes(subName);
          }
        }
      }
    }

    // Stock Filter
    if (onlyInStock && p.stock <= 0) {
      return false;
    }
    
    return matchesSearch && matchesCategory;
  });

  // Apply sorting options
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    // If a search query is typed and default sort 'featured' is used, sort by relevance score first!
    if (searchQuery.trim().length > 0 && sortBy === "featured") {
      const scoreA = calculateRelevance(a, searchQuery, store.dbCategories, store.dbSubcategories);
      const scoreB = calculateRelevance(b, searchQuery, store.dbCategories, store.dbSubcategories);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
    }
    if (sortBy === "price-asc") {
      return a.price - b.price;
    }
    if (sortBy === "price-desc") {
      return b.price - a.price;
    }
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // Default: Featured
    if (sortBy === "featured") {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
    }
    return 0;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedProducts.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedProducts, currentPage]);

  const featuredProducts = store.products.filter((p) => p.featured && !p.paused);

  const clothingProducts = store.products.filter((p) => {
    const cat = p.category.toLowerCase();
    return cat === "ropa" || cat.includes("vest") || cat.includes("calza") || cat.includes("prend") || cat.includes("buzo") || cat.includes("abrigo") || cat.includes("jean") || cat.includes("remera") || cat.includes("panta");
  });

  const electronicsProducts = store.products.filter((p) => {
    const cat = p.category.toLowerCase();
    return cat === "artículos electrónicos" || cat === "electrónica" || cat.includes("electron") || cat.includes("tecnol");
  });

  const otherProducts = store.products.filter((p) => {
    const cat = p.category.toLowerCase();
    const isCloth = cat === "ropa" || cat.includes("vest") || cat.includes("calza") || cat.includes("prend") || cat.includes("buzo") || cat.includes("abrigo") || cat.includes("jean") || cat.includes("remera") || cat.includes("panta");
    const isElec = cat === "artículos electrónicos" || cat === "electrónica" || cat.includes("electron") || cat.includes("tecnol");
    return !isCloth && !isElec;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
        <p className="font-mono text-sm text-zinc-400">Cargando base de datos de la tienda...</p>
      </div>
    );
  }

  return (
    <div id="app" className="min-h-screen flex flex-col font-sans transition-colors duration-200 bg-[#050B1A] text-[#F4EAD7]">
      
      {/* Dynamic theme style overrides */}
      <ThemeStyles settings={store.settings} />

      {/* Fixed Top Navigation Container */}
      <div className={`fixed top-0 left-0 right-0 w-full z-50 transition-all duration-300 ${
        scrolled 
          ? "bg-[#050B1A]/95 border-b border-[#D4A55A]/20 backdrop-blur-md shadow-lg shadow-black/30" 
          : "bg-[#050B1A] border-b border-[#D4A55A]/15 shadow-md shadow-black/10"
      }`}>
        {/* Top Banner Message for Promotions & Free Shipping Slider */}
        {bannerSlides.length > 0 && (
          <div className="theme-promo-banner h-9 px-4 md:px-12 text-center text-[11px] md:text-xs font-semibold relative z-30 flex items-center justify-between overflow-hidden font-sans group transition-all duration-300">
            {/* Slider Content Frame */}
            <div className="flex-1 h-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {bannerSlides[activeBannerIdx] && (
                  <motion.div
                    key={activeBannerIdx}
                    initial={bannerAnimationProps.initial}
                    animate={bannerAnimationProps.animate}
                    exit={bannerAnimationProps.exit}
                    transition={{ duration: 0.35, ease: "easeInOut" }}
                    className="flex items-center justify-center gap-2 w-full h-full"
                  >
                    {bannerSlides[activeBannerIdx].icon}
                    <span className="truncate max-w-[70vw] sm:max-w-[75vw] md:max-w-3xl select-all pointer-events-auto">
                      {bannerSlides[activeBannerIdx].text}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Main Layout Header based on design HTML & Professional Polish theme */}
        <header className="min-h-[3.5rem] h-14 md:h-16 flex items-center justify-between px-4 md:px-6 shrink-0 relative z-40 gap-3 md:gap-4 transition-all duration-300 bg-transparent">
        
        {/* Logo and container */}
        <div className="flex items-center gap-2 md:gap-4 select-none">
          <button 
            type="button"
            onClick={() => {
              setSelectedProduct(null);
              setActiveTab("storefront");
              navigateToProductRoute("todos", "all");
              setSearchQuery("");
              setIsHeaderSearchOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 md:gap-4 shrink-0 cursor-pointer border-none bg-transparent text-left outline-none p-0"
          >
            {/* Elegant Circular Logo inspired by Juem logo from design HTML */}
            {store.settings.logoType === "image" && !!store.settings.logoImageUrl ? (
              <img
                src={store.settings.logoImageUrl}
                alt={store.settings.siteTitle}
                className="w-8 h-8 rounded-xl object-cover shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 bg-[#D4A55A] rounded-xl flex items-center justify-center text-[#050B1A] font-bold text-lg shadow-sm">
                {store.settings.logoText || "J"}
              </div>
            )}
            <div>
              <h1 className="font-serif font-bold text-base md:text-xl tracking-widest text-[#F4EAD7] flex items-center gap-1.5">
                <span>{store.settings.siteTitle}</span>
              </h1>
            </div>
          </button>
        </div>

        {/* Modern Clean Individual Category Hover/Click Dropdowns (Only shown for activeTab === "storefront") */}
        {activeTab === "storefront" && (
          <div className="hidden lg:flex items-center flex-wrap gap-1.5 sm:gap-3 md:gap-4 py-1 relative z-50 overflow-visible justify-center">
            {(store.dbCategories || [])
              .filter(c => c.active !== false)
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map((catObj) => {
                const displayName = catObj.nombre;
                const isCatActive = selectedCategory === catObj.nombre;
                
                // Get dynamic subcategories nested under this category
                const dbSubs = (store.dbSubcategories || []).filter(sub => sub.categoria_id === catObj.id && sub.active !== false);
                // Define complete menu subcategories list, starting with full collection explorer option
                const itemSubcategories = [
                  { id: "all", name: `Ver todo ${catObj.nombre}` },
                  ...dbSubs.map(s => ({ id: s.id, name: s.nombre }))
                ];
                
                const isOpen = activeDropdown === catObj.id;

                return (
                  <div
                    key={catObj.id}
                    className="relative shrink-0 category-dropdown-container"
                    onMouseEnter={() => {
                      if (window.innerWidth >= 768) {
                        setActiveDropdown(catObj.id);
                      }
                    }}
                    onMouseLeave={() => {
                      if (window.innerWidth >= 768) {
                        setActiveDropdown(null);
                      }
                    }}
                  >
                    {/* Category Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveDropdown(isOpen ? null : catObj.id);
                      }}
                      className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs font-bold transition-all duration-305 border select-none cursor-pointer tracking-tight ${
                        isCatActive
                          ? "bg-[#D4A55A] border-transparent text-[#050B1A] shadow-md shadow-[#D4A55A]/25 scale-[1.02]"
                          : "border-[#D4A55A]/25 bg-[#0B1730]/65 text-[#F4EAD7] hover:border-[#D4A55A]/60 hover:bg-[#D4A55A]/10 hover:text-[#E6BF76] hover:scale-[1.03] duration-300"
                      }`}
                    >
                      <span className="shrink-0 size-3.5 flex items-center justify-center [&_svg]:h-3.5 [&_svg]:w-3.5 opacity-80">
                        {getCategoryIcon(catObj.icono || catObj.nombre)}
                      </span>
                      <span>{displayName}</span>
                      <ChevronDown className={`h-3 w-3 transition-transform duration-300 opacity-60 ${isOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Dropdown Menu Container (using AnimatePresence and motion.div) */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 12, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="absolute top-full left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-0 mt-2.5 w-48 rounded-xl shadow-2xl p-1.5 z-50 origin-top bg-[#0B1730]/95 border border-[#D4A55A]/30 backdrop-blur-md text-[#F4EAD7] select-none"
                        >
                          {/* Inner list */}
                          <div className="flex flex-col gap-0.5">
                            {itemSubcategories.map((subcat) => {
                              const isSubcatActive = isCatActive && selectedSubcategory === subcat.id;
                              return (
                                <button
                                  key={subcat.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToProductRoute(catObj.id, subcat.id);
                                    setActiveDropdown(null);
                                  }}
                                  className={`w-full text-left text-[11px] py-2 px-2.5 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-between ${
                                    isSubcatActive
                                      ? "bg-[#D4A55A]/20 text-[#E6BF76]"
                                      : "text-[#F4EAD7]/80 hover:bg-[#D4A55A]/10 hover:text-[#E6BF76]"
                                  }`}
                                >
                                  <span>{subcat.name}</span>
                                  {isSubcatActive && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#E6BF76] shadow shadow-[#D4A55A]/40" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
          </div>
        )}

        {/* Dynamic Nav link / controls */}
        <div className="flex items-center gap-3 md:gap-4 font-sans text-sm shrink-0">
          {activeTab === "storefront" || activeTab === "checkout" ? (
            <>
              {activeTab === "checkout" ? (
                <button
                  onClick={() => {
                    setActiveTab("storefront");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition border border-[#D4A55A]/25 bg-[#0B1730]/65 text-[#F4EAD7] hover:border-[#D4A55A]/60 hover:bg-[#D4A55A]/10 hover:text-[#E6BF76] cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#E6BF76]" />
                  <span>Volver a la Tienda</span>
                </button>
              ) : (
                <>
                  {/* Expandable Search Input on Header */}
                  <div id="header-search-container" className={`relative items-center ${isHeaderSearchOpen ? 'flex' : 'hidden lg:flex'}`}>
                <motion.div
                  initial={false}
                  animate={{
                    width: isHeaderSearchOpen ? (window.innerWidth < 640 ? "170px" : "260px") : "36px"
                  }}
                  transition={{ type: "spring", stiffness: 350, damping: 26 }}
                  className={`flex items-center overflow-hidden rounded-full h-9 border ${
                    isHeaderSearchOpen 
                      ? "border-[#D4A55A]/50 bg-[#0B1730]/90 shadow-lg shadow-[#D4A55A]/5" 
                      : "border-[#D4A55A]/20 bg-[#0B1730]/30 hover:border-[#D4A55A]/55 hover:bg-[#0B1730]/60"
                  } transition-colors duration-250`}
                >
                  <button
                    onClick={() => {
                      if (!isHeaderSearchOpen) {
                        setIsHeaderSearchOpen(true);
                        // Focus the input
                        setTimeout(() => {
                          document.getElementById("header-search-input")?.focus();
                        }, 100);
                      } else {
                        // Close if empty, otherwise do nothing
                        if (!tempSearchQuery) {
                          setIsHeaderSearchOpen(false);
                          setShowSuggestions(false);
                          setSearchQuery("");
                        }
                      }
                    }}
                    className="p-2 flex items-center justify-center text-[#E6BF76] hover:text-[#F4EAD7] cursor-pointer shrink-0"
                    title="Buscar productos"
                  >
                    <Search className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {isHeaderSearchOpen && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center w-full pr-2.5"
                      >
                        <input
                          id="header-search-input"
                          type="text"
                          placeholder="Buscar..."
                          value={tempSearchQuery}
                          onChange={(e) => {
                            setTempSearchQuery(e.target.value);
                            setShowSuggestions(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              setSearchQuery(tempSearchQuery);
                              setShowSuggestions(false);
                            }
                          }}
                          onFocus={() => {
                            setShowSuggestions(true);
                          }}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                          className="w-full bg-transparent text-[#F4EAD7] placeholder-zinc-500 border-none outline-none ring-0 focus:ring-0 text-xs py-1 select-all"
                        />
                        {tempSearchQuery && (
                          <button
                            onClick={() => {
                              setTempSearchQuery("");
                              setSearchQuery("");
                              setShowSuggestions(false);
                            }}
                            className="text-[#E6BF76] hover:text-[#F4EAD7] text-sm px-1.5 font-bold font-mono cursor-pointer shrink-0"
                          >
                            ×
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Float Autocomplete Suggestions right under Header Search */}
                {isHeaderSearchOpen && showSuggestions && tempSearchQuery.trim().length >= 2 && (() => {
                  const normQ = normalizeText(tempSearchQuery);
                  
                  // 1. Match categories
                  const matchingCats = (store.dbCategories || [])
                    .filter(c => c.active !== false && normalizeText(c.nombre).includes(normQ));
                  
                  const matchingSubs = (store.dbSubcategories || [])
                    .filter(s => s.active !== false && normalizeText(s.nombre).includes(normQ));

                  // 2. Match products (top 5 matched)
                  const matchingProds = store.products
                    .filter(p => !p.paused && p.active !== false)
                    .map(p => ({
                      product: p,
                      score: calculateRelevance(p, tempSearchQuery, store.dbCategories, store.dbSubcategories)
                    }))
                    .filter(item => item.score > 0)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5);

                  const hasAnySuggestion = matchingCats.length > 0 || matchingSubs.length > 0 || matchingProds.length > 0;

                  return (
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 bg-[#0B1730]/95 border border-[#D4A55A]/30 backdrop-blur-md rounded-xl shadow-2xl z-55 overflow-hidden divide-y divide-[#D4A55A]/10 w-[280px] sm:w-[320px] md:w-[360px]"
                      >
                        {!hasAnySuggestion ? (
                          <div className="p-4 text-center">
                            <p className="text-xs text-zinc-400">
                              No hay sugerencias para "{tempSearchQuery}"
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Categories */}
                            {(matchingCats.length > 0 || matchingSubs.length > 0) && (
                              <div className="p-2 bg-[#0B1730]/50">
                                <span className="block text-[9px] font-extrabold uppercase text-[#E6BF76]/60 px-2 py-0.5 tracking-wider">
                                  Categorías sugeridas
                                </span>
                                <div className="space-y-0.5 mt-1">
                                  {matchingCats.map(cat => (
                                    <button
                                      key={`header-cat-sug-${cat.id}`}
                                      onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setSelectedSubcategory("all");
                                        setSearchQuery("");
                                        setShowSuggestions(false);
                                        setIsHeaderSearchOpen(false);
                                      }}
                                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#D4A55A]/10 text-[#F4EAD7] hover:text-[#E6BF76] transition-colors flex items-center justify-between cursor-pointer border-0 bg-transparent"
                                    >
                                      <span className="font-semibold">{cat.nombre}</span>
                                      <span className="text-[9px] text-[#E6BF76]/70">Ver ›</span>
                                    </button>
                                  ))}
                                  {matchingSubs.map(sub => {
                                    const parentCat = (store.dbCategories || []).find(c => c.id === sub.categoria_id);
                                    return (
                                      <button
                                        key={`header-sub-sug-${sub.id}`}
                                        onClick={() => {
                                          if (parentCat) {
                                            setSelectedCategory(parentCat.id);
                                          }
                                          setSelectedSubcategory(sub.id);
                                          setSearchQuery("");
                                          setShowSuggestions(false);
                                          setIsHeaderSearchOpen(false);
                                        }}
                                        className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#D4A55A]/10 text-[#F4EAD7] hover:text-[#E6BF76] transition-colors flex items-center justify-between cursor-pointer border-0 bg-transparent"
                                      >
                                        <span>{parentCat?.nombre || "Otros"} › <span className="font-semibold text-[#E6BF76]">{sub.nombre}</span></span>
                                        <span className="text-[9px] text-[#E6BF76]/70">Ver ›</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Products */}
                            {matchingProds.length > 0 && (
                              <div className="p-2">
                                <span className="block text-[9px] font-extrabold uppercase text-[#E6BF76]/60 px-2 py-0.5 tracking-wider">
                                  Artículos sugeridos
                                </span>
                                <div className="space-y-1 mt-1">
                                  {matchingProds.map(item => {
                                    const p = item.product;
                                    return (
                                      <button
                                        key={`header-prod-sug-${p.id}`}
                                        onClick={() => {
                                          handleOpenProduct(p);
                                          setShowSuggestions(false);
                                          setIsHeaderSearchOpen(false);
                                        }}
                                        className="w-full text-left p-1 rounded hover:bg-[#D4A55A]/10 transition-colors flex items-center gap-2 cursor-pointer group border-0 bg-transparent"
                                      >
                                        <div className="w-8 h-8 rounded overflow-hidden bg-[#050B1A] shrink-0 border border-[#D4A55A]/25">
                                          <img
                                            src={p.imageUrl || "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=100&q=80"}
                                            alt={p.name}
                                            referrerPolicy="no-referrer"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                          />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <span className="block text-[11px] font-bold text-[#F4EAD7] truncate group-hover:text-[#E6BF76] transition-colors">
                                            {p.name}
                                          </span>
                                          <span className="block text-[9px] text-zinc-400 truncate">
                                            {p.category} | {p.stock > 0 ? `${p.stock} dispo` : "Bajo demanda"}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="text-[11px] font-black text-[#E6BF76]">
                                            ${Math.round(p.price)}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="p-1 px-2 flex justify-between bg-[#0B1730] text-[9px] text-[#E6BF76]/80">
                              <span>Sugerido</span>
                              <button
                                onClick={() => {
                                  setSearchQuery(tempSearchQuery);
                                  setShowSuggestions(false);
                                }}
                                className="hover:underline font-bold bg-transparent border-0 cursor-pointer text-[#E6BF76]"
                              >
                                Ver todos ({
                                  store.products.filter(p => 
                                    !p.paused && 
                                    p.active !== false && 
                                    calculateRelevance(p, tempSearchQuery, store.dbCategories, store.dbSubcategories) > 0
                                  ).length
                                })
                              </button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  );
                })()}
              </div>

              {/* Shopping Cart Trigger */}
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 rounded-xl transition hidden lg:flex items-center gap-1.5 hover:bg-[#0B1730] text-[#E6BF76] hover:text-[#F4EAD7] cursor-pointer"
              >
                <CartIcon className="h-5 w-5" />
                <span className="text-xs font-sans font-bold bg-[#D4A55A] text-[#050B1A] rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </button>

              {/* Toggle to admin */}
              {authToken && (
                <button
                  onClick={() => {
                    setActiveTab("admin");
                    window.history.pushState(null, "", `/admin/${adminSection}`);
                  }}
                  className="hidden lg:flex items-center gap-1 text-xs font-bold py-1.5 px-3 rounded-lg bg-[#D4A55A]/10 hover:bg-[#D4A55A]/20 text-[#E6BF76] transition cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Panel Admin</span>
                </button>
              )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Active Synchronization state panel from design HTML */}
              <div className="flex items-center gap-2 px-2.5 py-1 bg-green-500/10 text-green-400 rounded-full border border-green-500/20">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-semibold uppercase tracking-wider hidden md:inline">Base de Datos Sincronizada</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider md:hidden">Sincronizado</span>
              </div>

              {/* View Store button */}
              <button
                onClick={() => setActiveTab("storefront")}
                className={`flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-lg transition ${
                  store.settings.themeMode === "dark" 
                    ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300" 
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Ver Tienda</span>
              </button>

              {/* Active account details (Juem) */}
              <div className="flex items-center gap-2 pl-3 border-l border-zinc-700/50">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold leading-none">Juem</p>
                  <p className="text-[9px] text-zinc-500">Administrador Principal</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-1 text-red-400 hover:bg-red-400/15 rounded transition"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </header>
    </div>

    {/* Dynamic Spacer to prevent content from slipping under fixed navbar */}
    <div 
      className={
        bannerSlides.length > 0
          ? "h-[92px] lg:h-[100px]"
          : "h-[56px] lg:h-[64px]"
      }
    />

      {/* RENDER STOREFRONT OPTION */}
      {activeTab === "storefront" && (
        <div className="flex-1 flex flex-col pb-16 lg:pb-0">
          {selectedProduct ? (
            <ProductDetails
              product={store.products.find(p => String(p.id) === String(selectedProduct.id)) || selectedProduct}
              onClose={() => {
                setSelectedProduct(null);
                const catalogPath = getCatalogPath();
                window.history.pushState(null, "", catalogPath);
              }}
              onAddToCart={(p, sz, col, qty) => {
                handleAddToCart(p, sz, col, qty);
              }}
              settings={store.settings}
              allProducts={store.products}
              dbCategories={store.dbCategories || []}
              onViewProduct={(p) => {
                setSelectedProduct(p);
                window.history.pushState(null, "", `/producto/${generateSlug(p.name)}`);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              isCartOpen={isCartOpen}
            />
          ) : (
            <>
              {/* Interactive Hero Slider Showcase */}
          {selectedCategory === "todos" && !searchQuery && (
            <HeroSlider
              settings={store.settings}
              onExploreCatalog={(slideLink) => {
                if (!slideLink) {
                  const el = document.getElementById("catalog-view");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  return;
                }

                if (slideLink.startsWith("category:")) {
                  const catName = slideLink.replace("category:", "");
                  setSelectedCategory(catName);
                  setSelectedSubcategory("all");
                  setTimeout(() => {
                    const el = document.getElementById("catalog-view");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                } else if (slideLink.startsWith("subcategory:")) {
                  const subId = slideLink.replace("subcategory:", "");
                  const subcat = (store.dbSubcategories || []).find(s => s.id === subId);
                  if (subcat) {
                    const catObj = (store.dbCategories || []).find(c => c.id === subcat.categoria_id);
                    if (catObj) {
                      setSelectedCategory(catObj.nombre);
                    }
                    setSelectedSubcategory(subId);
                    setTimeout(() => {
                      const el = document.getElementById("catalog-view");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }
                } else if (slideLink.startsWith("product:")) {
                  const prodId = slideLink.replace("product:", "");
                  const prod = store.products.find(p => String(p.id) === String(prodId));
                  if (prod) {
                    handleOpenProduct(prod);
                  }
                } else if (slideLink.startsWith("http://") || slideLink.startsWith("https://")) {
                  window.open(slideLink, "_blank");
                } else if (slideLink.startsWith("#") && slideLink.length > 1) {
                  const el = document.getElementById(slideLink.substring(1));
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                } else {
                  const el = document.getElementById("catalog-view");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }
              }}
            />
          )}

          {/* Search bar container */}
          <section id="catalog-view" className="py-8 max-w-7xl mx-auto px-6 w-full flex-1">


            {/* Subcategory Pills Bar (Shown when a specific category is selected and contains subcategories) */}
            {(() => {
              const activeCategoryObject = (store.dbCategories || []).find(
                (c) => c.nombre === selectedCategory || c.id === selectedCategory
              );
              if (!activeCategoryObject) return null;
              
              const currentSubs = (store.dbSubcategories || []).filter(
                (s) => s.categoria_id === activeCategoryObject.id && s.active !== false
              );
              if (currentSubs.length === 0) return null;

              return (
                <div className="flex items-center gap-2 py-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-b border-zinc-200/50 dark:border-zinc-800/55 pb-4 mb-6 select-none -mx-6 px-6 lg:mx-0 lg:px-0">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-500 mr-2 tracking-wider shrink-0">Subcategorías:</span>
                  <button
                    onClick={() => {
                      navigateToProductRoute(activeCategoryObject.id, "all");
                    }}
                    className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 duration-150 ${
                      !selectedSubcategory || selectedSubcategory === "all"
                        ? "bg-[#E6BF76]/25 border-[#E6BF76]/60 text-[#E6BF76] font-black"
                        : "bg-[#0B1730]/40 text-[#F4EAD7]/75 border-zinc-800 hover:border-[#D4A55A]/30 hover:text-[#E6BF76]"
                    }`}
                  >
                    Ver Todo
                  </button>
                  {currentSubs.map((subObj) => {
                    const isSubActive = selectedSubcategory === subObj.id;
                    return (
                      <button
                        key={subObj.id}
                        onClick={() => {
                          navigateToProductRoute(activeCategoryObject.id, subObj.id);
                        }}
                        className={`py-1.5 px-3.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer active:scale-95 duration-150 ${
                          isSubActive
                            ? "bg-[#E6BF76]/25 border-[#E6BF76]/60 text-[#E6BF76] font-black"
                            : "bg-[#0B1730]/40 text-[#F4EAD7]/75 border-zinc-800 hover:border-[#D4A55A]/30 hover:text-[#E6BF76]"
                        }`}
                      >
                        {subObj.nombre}
                      </button>
                    );
                  })}
                </div>
              );
            })()}

            {/* Filtros & Orden buttons removed as per user request */}

            {/* Collapsible advanced filters panel - Desktop Only */}
            <AnimatePresence>
              {(selectedCategory !== "todos" || showAllProductsFlat) && showFiltersPanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="hidden md:block overflow-hidden pb-6 border-b border-zinc-200/50 dark:border-zinc-800/50 mb-6"
                >
                  <div className={`p-5 rounded-2xl border ${
                    store.settings.themeMode === "dark"
                      ? "bg-zinc-950/40 border-zinc-900"
                      : "bg-slate-50/50 border-slate-200"
                  } grid grid-cols-1 sm:grid-cols-2 gap-6`}>
                    
                    {/* Collapsible Sorting options */}
                    <div>
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3">
                        Ordenar por
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "featured", label: "Destacados ⭐" },
                          { id: "price-asc", label: "Menor Precio 📈" },
                          { id: "price-desc", label: "Mayor Precio 📉" },
                          { id: "newest", label: "Más Recientes 📅" }
                        ].map(option => (
                          <button
                            key={option.id}
                            onClick={() => setSortBy(option.id)}
                            className={`px-3 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-205 text-center ${
                              sortBy === option.id
                                ? "theme-btn-primary text-white scale-[1.01]"
                                : store.settings.themeMode === "dark"
                                ? "bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-white border border-zinc-800"
                                : "bg-slate-100 text-zinc-600 hover:bg-slate-200/60 hover:text-zinc-900 border border-slate-200"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stock switch availability */}
                    <div className="flex flex-col justify-center">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-3 font-semibold">
                        Disponibilidad
                      </h4>
                      <div className="block">
                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={onlyInStock}
                            onChange={(e) => setOnlyInStock(e.target.checked)}
                            className="rounded border-zinc-300 dark:border-zinc-800 text-indigo-600 focus:ring-indigo-550 h-4 w-4 pointer-events-auto cursor-pointer"
                          />
                          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Mostrar solo productos con Stock disponible</span>
                        </label>
                      </div>
                    </div>

                  </div>

                  {/* Clean filters notification strip */}
                  {(onlyInStock || sortBy !== "featured") && (
                    <div className="flex items-center justify-between gap-3 mt-4 px-2">
                      <span className="text-[11px] text-indigo-400 font-semibold">✨ Filtro rápido activo para ordenar tu catálogo</span>
                      <button
                        onClick={() => {
                          setOnlyInStock(false);
                          setSortBy("featured");
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                      >
                        Limpiar Selección ×
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile Bottom Sheet Filters Panel - Mobile Only (Drawer slide up) */}
            <AnimatePresence>
              {(selectedCategory !== "todos" || showAllProductsFlat) && showFiltersPanel && (
                <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center pointer-events-none">
                  {/* Backdrop overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setShowFiltersPanel(false)}
                    className="absolute inset-0 bg-black/75 backdrop-blur-xs pointer-events-auto"
                  />

                  {/* Drawer Sheet */}
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 26, stiffness: 220 }}
                    className={`relative w-full rounded-t-[2rem] border-t shadow-2xl flex flex-col max-h-[85vh] pointer-events-auto overflow-hidden z-10 ${
                      store.settings.themeMode === "dark"
                        ? "bg-[#090F21] border-[#D4A55A]/25 text-white"
                        : "bg-white border-slate-200 text-zinc-950"
                    }`}
                  >
                    {/* Top pill drag handle */}
                    <div className="w-12 h-1.5 bg-zinc-300 dark:bg-zinc-850 rounded-full mx-auto my-3 shrink-0" />

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 pb-4 border-b border-zinc-150 dark:border-zinc-900 shrink-0">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-[#D4A55A]" />
                        <span className="text-sm font-bold uppercase tracking-wider">Filtros & Orden</span>
                      </div>
                      <button
                        onClick={() => setShowFiltersPanel(false)}
                        className="p-1 px-2.5 rounded-lg text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                      >
                        Cerrar
                      </button>
                    </div>

                    {/* Content Scroll Area */}
                    <div className="overflow-y-auto px-6 py-5 space-y-6 pb-28">
                      {/* Section 1: Order by */}
                      <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A] mb-3">
                          Ordenar por
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { id: "featured", label: "Destacados ⭐" },
                            { id: "price-asc", label: "Menor Precio 📈" },
                            { id: "price-desc", label: "Mayor Precio 📉" },
                            { id: "newest", label: "Más Recientes 📅" }
                          ].map(option => (
                            <button
                              key={option.id}
                              onClick={() => setSortBy(option.id)}
                              className={`py-3 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all duration-200 text-center ${
                                sortBy === option.id
                                  ? "bg-[#D4A55A]/15 text-[#E6BF76] border border-[#D4A55A]/60 font-black shadow-sm"
                                  : store.settings.themeMode === "dark"
                                  ? "bg-zinc-900/40 text-zinc-400 border border-zinc-905 hover:text-white"
                                  : "bg-slate-50 text-zinc-600 border border-slate-150 hover:bg-slate-100"
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Store Availability */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]">
                          Disponibilidad
                        </h4>
                        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-150 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/10">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold">Solo con Stock disponible</span>
                            <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">Ocultar productos agotados</span>
                          </div>
                          <button
                            onClick={() => setOnlyInStock(!onlyInStock)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer outline-none ${
                              onlyInStock ? "bg-indigo-600 dark:bg-[#D4A55A]" : "bg-zinc-300 dark:bg-zinc-800"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                                onlyInStock ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Section 3: Categories & Subcategories */}
                      <div>
                        <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A] mb-3">
                          Categorías
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              navigateToProductRoute("todos", "all", true);
                            }}
                            className={`py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                              selectedCategory === "todos"
                                ? "bg-[#D4A55A] text-[#050B1A] border-[#D4A55A]"
                                : store.settings.themeMode === "dark"
                                ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                                : "bg-slate-50 border-slate-200 text-zinc-700"
                            }`}
                          >
                            Todos
                          </button>
                          {(store.dbCategories || []).filter(c => c.active !== false).map((cat) => {
                            const isCatActive = selectedCategory === cat.nombre || selectedCategory === cat.id;
                            return (
                              <button
                                key={cat.id}
                                onClick={() => {
                                  navigateToProductRoute(cat.id, "all");
                                }}
                                className={`py-2 px-3.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                                  isCatActive
                                    ? "bg-[#D4A55A] text-[#050B1A] border-[#D4A55A]"
                                    : store.settings.themeMode === "dark"
                                    ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                                    : "bg-slate-50 border-slate-200 text-zinc-700"
                                }`}
                              >
                                {cat.nombre}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Subcategories if category selected has subs */}
                      {(() => {
                        const activeCategoryObject = (store.dbCategories || []).find(
                          (c) => c.nombre === selectedCategory || c.id === selectedCategory
                        );
                        if (!activeCategoryObject) return null;
                        
                        const currentSubs = (store.dbSubcategories || []).filter(
                          (s) => s.categoria_id === activeCategoryObject.id && s.active !== false
                        );
                        if (currentSubs.length === 0) return null;

                        return (
                          <div className="space-y-3 pt-3 border-t border-zinc-150 dark:border-zinc-900">
                            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]">
                              Subcategorías de {activeCategoryObject.nombre}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  navigateToProductRoute(activeCategoryObject.id, "all");
                                }}
                                className={`py-1.5 px-3 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                  !selectedSubcategory || selectedSubcategory === "all"
                                    ? "bg-[#E6BF76]/20 border-[#E6BF76]/60 text-[#E6BF76]"
                                    : store.settings.themeMode === "dark"
                                    ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                                    : "bg-slate-50 border-slate-200 text-zinc-700"
                                }`}
                              >
                                Ver Todo
                              </button>
                              {currentSubs.map((subObj) => {
                                const isSubActive = selectedSubcategory === subObj.id;
                                return (
                                  <button
                                    key={subObj.id}
                                    onClick={() => {
                                      navigateToProductRoute(activeCategoryObject.id, subObj.id);
                                    }}
                                    className={`py-1.5 px-3 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                      isSubActive
                                        ? "bg-[#E6BF76]/20 border-[#E6BF76]/60 text-[#E6BF76]"
                                        : store.settings.themeMode === "dark"
                                        ? "bg-zinc-900/50 border-zinc-800 text-zinc-300"
                                        : "bg-slate-50 border-slate-200 text-zinc-700"
                                    }`}
                                  >
                                    {subObj.nombre}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Bottom Action Footer Bar */}
                    <div className={`absolute bottom-0 left-0 right-0 p-4 border-t flex gap-3 z-20 ${
                      store.settings.themeMode === "dark"
                        ? "bg-[#090F21]/95 border-zinc-900/80 text-white backdrop-blur-md"
                        : "bg-white/95 border-slate-150 text-zinc-950 backdrop-blur-md"
                    }`}>
                      {(onlyInStock || sortBy !== "featured" || selectedCategory !== "todos" || selectedSubcategory !== "all") && (
                        <button
                          onClick={() => {
                            setOnlyInStock(false);
                            setSortBy("featured");
                            navigateToProductRoute("todos", "all", true);
                          }}
                          className="px-4 py-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold transition-all shrink-0 cursor-pointer"
                        >
                          Limpiar
                        </button>
                      )}
                      <button
                        onClick={() => setShowFiltersPanel(false)}
                        className="flex-1 py-3 text-center rounded-xl bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] hover:brightness-110 active:brightness-95 text-zinc-950 text-xs font-black transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Ver {sortedProducts.length} productos
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Clean current filters notification strip on non-panel view */}
            {(selectedCategory !== "todos" || showAllProductsFlat) && !showFiltersPanel && (onlyInStock || sortBy !== "featured") && (
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-zinc-200/50 dark:border-zinc-805/50 mb-6 px-1">
                <span className="text-[11px] text-[#E6BF76] font-semibold">✨ Filtro rápido activo para ordenar tu catálogo</span>
                <button
                  onClick={() => {
                    setOnlyInStock(false);
                    setSortBy("featured");
                  }}
                  className="px-3 py-1 rounded-lg text-xs font-bold text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
                >
                  Limpiar Orden ×
                </button>
              </div>
            )}

            {/* Featured Showcase if there are products marked featured */}
            {featuredProducts.length > 0 && selectedCategory === "todos" && !showAllProductsFlat && !searchQuery && (
              <div className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-1.5 h-6 theme-btn-primary rounded-full"></div>
                  <h3 className="text-xl font-bold tracking-tight">Destacados</h3>
                  <span className="text-[10px] uppercase font-bold text-yellow-400 animate-pulse">¡Los más buscados!</span>
                </div>
                <ProductSlider
                  products={featuredProducts}
                  settings={store.settings}
                  onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                  onViewProduct={(prod) => handleOpenProduct(prod)}
                  emptyIcon={<ShoppingBag className="h-6 w-6" />}
                  emptyText="No hay productos destacados activos."
                  emptySubtext=""
                />
              </div>
            )}

            {/* If there's an active filter query, category, or custom sorting, show a single filtered/sorted grid view */}
            {(selectedCategory !== "todos" || showAllProductsFlat || searchQuery || onlyInStock || sortBy !== "featured") ? (
              <>
                <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-6 theme-btn-accent rounded-full"></div>
                    <h3 className="text-xl font-bold tracking-tight">
                      {searchQuery ? (
                        "Resultados de Búsqueda"
                      ) : selectedCategory !== "todos" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span>{getCategoryDisplayName(selectedCategory)}</span>
                          {selectedSubcategory && selectedSubcategory !== "all" && (
                            <>
                              <span className="text-zinc-400 dark:text-zinc-600 font-normal">›</span>
                              <span className="text-zinc-400 dark:text-zinc-500 font-medium text-base">
                                {SUBCATEGORIES_MAP[selectedCategory]?.find(s => s.id === selectedSubcategory)?.name || selectedSubcategory}
                              </span>
                            </>
                          )}
                        </span>
                      ) : (
                        "Catálogo de Productos"
                      )}
                    </h3>
                    <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">({sortedProducts.length} productos)</span>
                  </div>

                  {/* Mobile Layout Mode Toggle (Compact Grid 2 vs List 1) */}
                  <div className="lg:hidden flex items-center bg-[#0B1730]/60 border border-[#D4A55A]/20 rounded-xl p-0.5 gap-0.5">
                    <button
                      onClick={() => setMobileLayoutMode("grid")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        mobileLayoutMode === "grid"
                          ? "bg-[#D4A55A] text-[#050B1A]"
                          : "text-zinc-400 hover:text-[#E6BF76]"
                      }`}
                      title="Vista de Cuadrícula"
                    >
                      <Grid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setMobileLayoutMode("list")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        mobileLayoutMode === "list"
                          ? "bg-[#D4A55A] text-[#050B1A]"
                          : "text-zinc-400 hover:text-[#E6BF76]"
                      }`}
                      title="Vista de Lista"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {sortedProducts.length === 0 ? (
                  <div className={`p-16 text-center rounded-2xl border border-dashed ${
                    store.settings.themeMode === "dark" ? "border-zinc-800 text-zinc-500" : "border-slate-200 text-slate-400"
                  }`}>
                    <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-60" />
                    <p className="text-base font-semibold">No se encontraron productos coincidentes</p>
                    <p className="text-xs mt-1">Prueba a restablecer filtros o cambiar tu término de búsqueda e intenta nuevamente.</p>
                    <button
                      onClick={() => {
                        navigateToProductRoute("todos", "all", true);
                        setSearchQuery("");
                        setOnlyInStock(false);
                        setSortBy("featured");
                      }}
                      className="mt-4 px-4 py-2 rounded-xl text-xs theme-btn-primary inline-block font-semibold pointer-events-auto cursor-pointer"
                    >
                      Ver todo el catálogo
                    </button>
                  </div>
                ) : (
                  <>
                    <div className={`grid gap-3 sm:gap-6 ${
                      mobileLayoutMode === "list"
                        ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                        : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                    }`}>
                      {paginatedProducts.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          layoutMode={mobileLayoutMode}
                          settings={store.settings}
                          onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                          onViewProduct={(prod) => handleOpenProduct(prod)}
                        />
                      ))}
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/50">
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                          Mostrando <span className="font-bold text-zinc-700 dark:text-zinc-300">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedProducts.length)}</span> al <span className="font-bold text-zinc-700 dark:text-zinc-300">{Math.min(currentPage * itemsPerPage, sortedProducts.length)}</span> de <span className="font-bold text-[#D4A55A]">{sortedProducts.length}</span> productos
                        </div>
                        
                        <div className="flex items-center gap-1.5">
                          {/* Prev Page */}
                          <button
                            onClick={() => {
                              if (currentPage > 1) {
                                setCurrentPage(currentPage - 1);
                                document.getElementById("catalog-view")?.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            disabled={currentPage === 1}
                            className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                              store.settings.themeMode === "dark"
                                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                            }`}
                            title="Página Anterior"
                          >
                            <ChevronLeft className="h-4 w-4" />
                            <span className="hidden sm:inline">Anterior</span>
                          </button>

                          {/* Numbers */}
                          <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }).map((_, index) => {
                              const pageNum = index + 1;
                              if (
                                pageNum === 1 ||
                                pageNum === totalPages ||
                                Math.abs(pageNum - currentPage) <= 1
                              ) {
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => {
                                      setCurrentPage(pageNum);
                                      document.getElementById("catalog-view")?.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer flex items-center justify-center ${
                                      currentPage === pageNum
                                        ? "bg-gradient-to-r from-[#D4A55A] to-[#E6BF76] text-zinc-950 shadow-sm outline-none"
                                        : store.settings.themeMode === "dark"
                                        ? "bg-zinc-900 border border-zinc-805 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                        : "bg-white border border-slate-200 text-zinc-700 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              }
                              
                              if (
                                pageNum === 2 ||
                                pageNum === totalPages - 1
                              ) {
                                return (
                                  <span key={pageNum} className="px-1 text-xs text-zinc-400 font-bold">
                                    ...
                                  </span>
                                );
                              }

                              return null;
                            })}
                          </div>

                          {/* Next Page */}
                          <button
                            onClick={() => {
                              if (currentPage < totalPages) {
                                setCurrentPage(currentPage + 1);
                                document.getElementById("catalog-view")?.scrollIntoView({ behavior: "smooth" });
                              }
                            }}
                            disabled={currentPage === totalPages}
                            className={`p-2 px-3 rounded-xl border text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40 disabled:pointer-events-none ${
                              store.settings.themeMode === "dark"
                                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                                : "bg-white border-slate-200 text-zinc-700 hover:bg-slate-50"
                            }`}
                            title="Siguiente Página"
                          >
                            <span className="hidden sm:inline">Siguiente</span>
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              /* Custom dynamic database-driven categorizations when viewing "Todos" */
              <div className="space-y-16">
                {(store.dbCategories || [])
                  .filter((catObj) => catObj.active !== false)
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                  .map((catObj) => {
                    const catProducts = store.products.filter(
                      (p) => 
                        p.categoria_id === catObj.id || 
                        p.category?.toLowerCase() === catObj.nombre?.toLowerCase() ||
                        (p.categorias_adicionales && p.categorias_adicionales.includes(catObj.id))
                    );
                    
                    return (
                      <div key={catObj.id} className="scroll-mt-24">
                        <div className="flex items-center justify-between border-b border-zinc-100/10 dark:border-zinc-800 pb-3 mb-6">
                          <button
                            onClick={() => navigateToProductRoute(catObj.id, "all")}
                            className="flex items-center gap-2 text-left group cursor-pointer focus:outline-none"
                          >
                            <div className="w-1.5 h-6 rounded-full transition-transform duration-300 group-hover:scale-y-125" style={{ backgroundColor: store.settings.primaryColor }}></div>
                            <span className="p-1.5 rounded-lg flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4 transition-transform duration-300 group-hover:scale-110" style={{ color: store.settings.primaryColor, backgroundColor: `${store.settings.primaryColor}15` }}>
                              {getCategoryIcon(catObj.icono || catObj.nombre)}
                            </span>
                            <h3 className="text-xl font-extrabold tracking-tight flex items-center gap-1.5">
                              <span className="group-hover:underline">{catObj.nombre}</span>
                              <span 
                                className="text-sm opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-1 group-hover:translate-x-0"
                                style={{ color: store.settings.primaryColor }}
                              >
                                &rarr;
                              </span>
                            </h3>
                          </button>
                        </div>

                        <ProductSlider
                          products={catProducts}
                          settings={store.settings}
                          onAddToCart={(prod, sz, col) => handleAddToCart(prod, sz, col)}
                          onViewProduct={(prod) => handleOpenProduct(prod)}
                          emptyIcon={getCategoryIcon(catObj.icono || catObj.nombre)}
                          emptyText={`No se encontraron artículos de ${catObj.nombre}.`}
                          emptySubtext={`Puedes crear artículos desde el panel de productos asignando como categoría "${catObj.nombre}".`}
                        />
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Features highlight banner */}
          <footer className={`py-10 sm:py-14 border-t mt-12 sm:mt-16 transition-colors duration-200 relative overflow-hidden ${
            store.settings.themeMode === "dark" 
              ? "bg-[#050B1A] border-[#D4A55A]/25 text-slate-300" 
              : "bg-[#FAF7F2] border-slate-200 text-slate-700"
          }`}>
            {/* Top aesthetic ambient light strip */}
            {store.settings.themeMode === "dark" && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-[#D4A55A]/40 to-transparent"></div>
            )}
            
            <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-10">
              {/* BRAND COLUMN / REDES SOCIALES */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                store.settings.themeMode === "dark"
                  ? "bg-[#0B1730] border-[#D4A55A]/15 hover:border-[#D4A55A]/40 shadow-sm"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                    <Globe className="h-4 w-4" />
                  </span>
                  <h4 className={`font-bold text-xs uppercase tracking-wider font-sans ${
                    store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                  }`}>
                    Nuestras Redes
                  </h4>
                </div>
                
                <p className="text-xs leading-relaxed opacity-85 mb-4">
                  Sigue nuestras publicaciones, novedades del talle y promociones imperdibles agregadas diariamente.
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <a 
                    href="https://instagram.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] hover:brightness-110 text-white border-none shadow-sm transition-transform duration-100 active:scale-95 cursor-pointer"
                  >
                    <svg className="h-4 w-4 shrink-0 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.071 3.253.147 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.148 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                    </svg>
                    <span>Instagram</span>
                  </a>
                  <a 
                    href="https://facebook.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold bg-[#1877F2] hover:bg-[#165EAB] text-white border-none shadow-sm transition-transform duration-100 active:scale-95 cursor-pointer"
                  >
                    <svg className="h-4 w-4 shrink-0 fill-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                    <span>Facebook</span>
                  </a>
                </div>
              </div>

              {/* COLUMN 2 (Feature 1 - Compra Personalizada) */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                store.settings.themeMode === "dark"
                  ? "bg-[#0B1730] border-[#D4A55A]/15 hover:border-[#D4A55A]/40 shadow-sm"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <h4 className={`font-bold text-xs uppercase tracking-wider font-sans ${
                    store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                  }`}>
                    {store.settings.footerCol1Title || "🚀 Compra Personalizada"}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed opacity-85">
                  {store.settings.footerCol1Text || "Realiza tus pedidos seleccionando tus talles y colores favoritos. El carrito envía una lista formateada directo a nuestro WhatsApp de atención oficial para coordinar pago y entrega express."}
                </p>
              </div>

              {/* COLUMN 3 (Feature 2 - Calidad Asegurada) */}
              <div className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                store.settings.themeMode === "dark"
                  ? "bg-[#0B1730] border-[#D4A55A]/15 hover:border-[#D4A55A]/40 shadow-sm"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <h4 className={`font-bold text-xs uppercase tracking-wider font-sans ${
                    store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                  }`}>
                    {store.settings.footerCol2Title || "🌟 Calidad Asegurada"}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed opacity-85">
                  {store.settings.footerCol2Text || "Todos los productos que visualizas pasan por un control estricto de empaque y selección. Ofrecemos cambio de talle inmediato dentro de las 72 horas de recibida tu compra."}
                </p>
              </div>

              {/* COLUMN 4 (Google Maps / Ubicación Comercial) */}
              <div id="footer-map" className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                store.settings.themeMode === "dark"
                  ? "bg-[#0B1730] border-[#D4A55A]/15 hover:border-[#D4A55A]/40 shadow-sm"
                  : "bg-white border-slate-200 shadow-sm"
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="p-1.5 rounded-lg bg-[#D4A55A]/10 text-[#E6BF76]">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <h4 className={`font-bold text-xs uppercase tracking-wider font-sans ${
                      store.settings.themeMode === "dark" ? "text-[#F4EAD7]" : "text-slate-900"
                    }`}>
                      Nuestra Ubicación
                    </h4>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-80 mb-3">
                    Visítanos en nuestra tienda física. Consulta horarios y rutas directamente en el mapa interactivo.
                  </p>
                </div>
                <div className="w-full h-[140px] rounded-xl overflow-hidden border border-[#D4A55A]/15 relative">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3277.7005578324!2d-55.86459034517074!3d-34.763135191187786!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95a021e5c567911d%3A0x601fcf5d591c0db4!2sJuem!5e0!3m2!1ses-419!2suy!4v1781623339597!5m2!1ses-419!2suy" 
                    className="absolute inset-0 w-full h-full"
                    style={{ border: 0 }} 
                    allowFullScreen={true} 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                </div>
              </div>
            </div>

            {store.settings.googleReviewsEnabled !== false && (
              <GoogleReviewsCompact 
                themeMode={store.settings.themeMode} 
                googlePlaceId={store.settings.googlePlaceId} 
              />
            )}

            {/* Bottom copyright segment */}
            <div className={`max-w-7xl mx-auto px-6 mt-10 sm:mt-12 pt-6 sm:pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-[11px] ${
              store.settings.themeMode === "dark" ? "border-zinc-800/60" : "border-slate-200"
            }`}>
              <div className="space-y-1">
                <p className="font-medium">
                  &copy; 2026 {store.settings.siteTitle || "Ventas Juem"}. {store.settings.footerCopyright || "Desarrollado con tecnología de punta responsive. Reservados todos los derechos."}
                </p>
                <p className="opacity-60 flex items-center justify-center md:justify-start gap-1">
                  <MapPin className="h-3 w-3 text-[#D4A55A]" /> Montevideo, Uruguay • Conexión Segura vía WhatsApp Web API
                </p>
              </div>
              
              {!authToken && (
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer transition-all duration-300 ${
                    store.settings.themeMode === "dark"
                      ? "bg-[#0B1730] hover:bg-[#D4A55A]/15 border-[#D4A55A]/20 text-[#E6BF76]"
                      : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900"
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Acceso Administrativo</span>
                </button>
              )}
            </div>
          </footer>
        </>
      )}
        </div>
      )}

      {/* RENDER DYNAMIC CHECKOUT SECTION */}
      {activeTab === "checkout" && (
        <Checkout
          cartItems={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveCartItem}
          settings={store.settings}
          onClearCart={handleClearCart}
          onBackToCatalog={() => setActiveTab("storefront")}
          coupons={store.coupons}
        />
      )}

      {/* RENDER ADMIN DASHBOARD - SECURE ACCESS GUARD WHEN NOT AUTHENTICATED */}
      {activeTab === "admin" && !authToken && (
        <div className="flex-grow flex items-center justify-center p-6 bg-slate-100 dark:bg-zinc-950 min-h-[70vh]">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-red-500/10 dark:bg-red-500/5 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20 inline-block">
                Acceso Restringido - Ruta Protegida
              </span>
              <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Ruta Administrativa Protegida
              </h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-sm mx-auto leading-relaxed">
                No tienes autorización para acceder a este panel. Inicia sesión con tus credenciales de administrador para continuar. El acceso manual por URL está estrictamente restringido.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-3.5 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Nombre de Usuario</label>
                <input
                  required
                  type="text"
                  placeholder="ej. Juem"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Contraseña Segura</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              {loginError && (
                <p className="text-xs text-red-500 text-center font-bold">❌ {loginError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tracking-wider uppercase mt-4 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Acceder al Panel Admin</span>
              </button>
            </form>

            <div className="pt-2">
              <button
                onClick={() => navigateToProductRoute("todos", "all")}
                className="text-xs font-bold text-slate-500 dark:text-zinc-500 hover:text-slate-800 dark:hover:text-zinc-300 underline cursor-pointer"
              >
                Volver a la Tienda Pública
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER ADMIN DASHBOARD - PRIVATE CONTROL PANEL */}
      {activeTab === "admin" && authToken && (
        <div className="dark flex-grow flex flex-col md:flex-row min-h-0 bg-zinc-950 text-zinc-100">
          
          {/* Left sidebar nav following Professional Polish theme instructions */}
          <aside className="w-full md:w-64 bg-zinc-950/90 text-zinc-200 flex flex-col shrink-0 border-r border-zinc-800/40 shadow-xl select-none">
            {/* Header de menú móvil visible sólo en pantallas chicas */}
            <div className="flex md:hidden items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 select-none">
              <div className="flex items-center gap-2">
                <span className="text-base">⚙️</span>
                <span className="text-xs font-black uppercase tracking-widest text-zinc-100">Control Panel</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileAdminMenuOpen(!mobileAdminMenuOpen)}
                className="p-1.5 focus:outline-none hover:bg-zinc-800 rounded-lg transition-colors text-zinc-300 hover:text-white flex items-center justify-center border border-zinc-800"
                id="admin-mobile-menu-toggle"
              >
                {mobileAdminMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>

            {/* Contenido colapsable en celular, auto expandido en escritorio */}
            <div className={`${mobileAdminMenuOpen ? "flex" : "hidden"} md:flex flex-col flex-grow min-h-0`}>
              <nav className="p-4 space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-505 font-extrabold mb-4 px-3 select-none">
                  Operaciones Comerciales
                </div>

                <button
                  onClick={() => navigateAdminSection("dashboard")}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    adminSection === "dashboard"
                      ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500"
                      : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Dashboard Principal</span>
                </button>

                <button
                  onClick={() => setShowAIAssistantSidebar(!showAIAssistantSidebar)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                    showAIAssistantSidebar
                      ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                      : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span>Asistente Copilot IA</span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${showAIAssistantSidebar ? "bg-indigo-450 animate-pulse" : "bg-zinc-600"}`} />
                </button>

                {/* Category Group 1 - Operaciones */}
                <div className="space-y-1.5 pt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-505 font-extrabold mb-2 px-3 select-none">
                    Operaciones de Venta
                  </div>

                  <button
                    onClick={() => navigateAdminSection("sales")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "sales"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CartIcon className="h-4 w-4" />
                      <span>Control de Pedidos</span>
                    </div>
                    {store.orders && store.orders.filter(o => o.status === "pedido_iniciado" || o.status === "pago_pendiente").length > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-550 text-white animate-pulse">
                        {store.orders.filter(o => o.status === "pedido_iniciado" || o.status === "pago_pendiente").length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => navigateAdminSection("shippings")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "shippings"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-zinc-400" />
                      <span>Planificación Envíos</span>
                    </div>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("stock")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "stock"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Box className="h-4 w-4" />
                      <span>Stock Almacén</span>
                    </div>
                    {totalStockAlerts > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                        outOfStockProducts.length > 0
                          ? "bg-red-500 text-white"
                          : "bg-amber-500 text-zinc-950"
                      }`}>
                        {totalStockAlerts}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => navigateAdminSection("bills")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "bills"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Receipt className="h-4 w-4 text-zinc-400" />
                      <span>Ingresar Boletas</span>
                    </div>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("finances")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "finances"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Scale className="h-4 w-4 text-zinc-400" />
                      <span>Resumen General</span>
                    </div>
                  </button>
                </div>
                
                {/* Category Group 2 - Catálogo */}
                <div className="space-y-1.5 pt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-505 font-extrabold mb-2 px-3 select-none">
                    Catálogo
                  </div>

                  <button
                    onClick={() => navigateAdminSection("products")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "products"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Grid className="h-4 w-4 text-zinc-400" />
                      <span>Mis Productos</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded">
                      {store.products.length}
                    </span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("categories")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "categories"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Sliders className="h-4 w-4 text-zinc-400" />
                    <span>Categorías & Menús</span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("promos")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "promos"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Tag className="h-4 w-4 text-zinc-400" />
                    <span>Cupones & Descuentos</span>
                  </button>
                </div>

                {/* Category Group 3 - Personalización */}
                <div className="space-y-1.5 pt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-505 font-extrabold mb-2 px-3 select-none">
                    Visuales y Portada
                  </div>

                  <button
                    onClick={() => navigateAdminSection("general")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "general"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Palette className="h-4 w-4 text-zinc-400" />
                    <span>Marca & Identidad</span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("banner")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "banner"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Image className="h-4 w-4 text-zinc-400" />
                    <span>Banners & Carrusel</span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("footer")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "footer"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Layout className="h-4 w-4 text-zinc-400" />
                    <span>Pie de Página (Footer)</span>
                  </button>
                </div>

                {/* Category Group 4 - Configuración */}
                <div className="space-y-1.5 pt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-505 font-extrabold mb-2 px-3 select-none">
                    Configuración de Tienda
                  </div>

                  <button
                    onClick={() => navigateAdminSection("checkout_config")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "checkout_config"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <ShoppingCart className="h-4 w-4 text-zinc-400" />
                    <span>Carrito & Envíos</span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("payments")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "payments"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <CreditCard className="h-4 w-4 text-zinc-400" />
                    <span>Métodos de Pago</span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("reviews")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "reviews"
                        ? "bg-[#4285F4]/15 text-[#4285F4] dark:text-blue-400 border-l-2 border-[#4285F4] font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Globe className="h-4 w-4 text-[#4285F4]" />
                    <span>Google Integraciones</span>
                  </button>
                </div>

                <div className="space-y-1.5 pt-4">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-505 font-extrabold mb-2 px-3 select-none">
                    Soporte & Seguridad
                  </div>

                  <button
                    onClick={() => navigateAdminSection("emails")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "emails"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Mail className="h-4 w-4 text-zinc-400" />
                    <span>Emails de Soporte</span>
                  </button>

                  <button
                    onClick={() => navigateAdminSection("security")}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      adminSection === "security"
                        ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500 font-bold"
                        : "hover:bg-zinc-850/60 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    <Lock className="h-4 w-4 text-zinc-400" />
                    <span>Seguridad de Acceso</span>
                  </button>
                </div>
              </nav>

              {/* Support Terminal Status Card */}
              <div className="mt-auto p-4 border-t border-zinc-800 bg-zinc-950/20">
                <div className="p-3 bg-zinc-900/40 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Terminal Activo</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 font-extrabold uppercase font-sans">
                      JU
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-zinc-200 truncate font-semibold">Admin Principal</p>
                      <p className="text-[9px] text-zinc-400 truncate">Sincronización online</p>
                    </div>
                  </div>
                  <div className="border-t border-zinc-800/65 pt-2 shrink-0">
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1 font-mono">
                      <span>Espacio de Datos</span>
                      <span className="text-[9.5px] font-semibold text-indigo-400 uppercase">Activo</span>
                    </div>
                    <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="w-1/4 h-full bg-indigo-500"></div>
                    </div>
                    <p className="text-[9.5px] text-zinc-400 mt-1 font-mono">
                      14.5 KB / 1.0 GB
                    </p>
                  </div>
                </div>
              </div>
            </div> {/* Closing mobile wrapper */}
          </aside>

          {/* Main admin Workspace workspace */}
          <main className="flex-1 flex flex-col p-6 gap-6 bg-zinc-950 text-zinc-100 overflow-y-auto">
            
            {/* Header control summary */}
            {adminSection !== "stock" && (
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 shrink-0">
                <div>
                  <h2 className="text-2xl font-bold font-sans text-zinc-100">
                    {adminSection === "dashboard" && "Dashboard General y Métricas"}
                    {adminSection === "general" && "Diseño, Tipos y Colores de Marca"}
                    {adminSection === "banner" && "Carrusel de Portada y Banners"}
                    {adminSection === "footer" && "Configuración de Columnas del Footer"}
                    {adminSection === "products" && "Catálogo General de Productos"}
                    {adminSection === "categories" && "Gestión de Categorías y Subcategorías"}
                    {adminSection === "promos" && "Herramientas de Cupones y Descuentos"}
                    {adminSection === "security" && "Configuración y Seguridad de Acceso"}
                    {adminSection === "stock" && "Nivel de Inventario y Alertas de Stock"}
                    {adminSection === "payments" && "Administración de Métodos de Pago"}
                    {adminSection === "reviews" && "Sincronización con Google e Integraciones"}
                    {adminSection === "assistant" && "Asistente Corporativo de IA"}
                  </h2>
                  <p className="text-slate-600 dark:text-zinc-400 text-xs flex flex-col sm:flex-row sm:items-center gap-3 mt-1.5 leading-relaxed">
                    <span>Modifica los contenidos de tu tienda en tiempo real. Los cambios se sincronizarán directamente con tu base de datos central sin tocar código.</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
                  {/* Persistent Assistant Button */}
                  <button
                    onClick={() => setShowAIAssistantSidebar(!showAIAssistantSidebar)}
                    className={`px-4 py-2 border rounded-xl font-semibold transition-all flex items-center gap-2 text-xs shadow-xs cursor-pointer ${
                      showAIAssistantSidebar
                        ? "bg-indigo-600/20 text-indigo-450 border-indigo-500/50 hover:bg-indigo-600/30"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    <Sparkles className={`h-4 w-4 ${showAIAssistantSidebar ? "text-indigo-400 animate-pulse" : "text-zinc-400"}`} />
                    <span>{showAIAssistantSidebar ? "Cerrar Copilot" : "Preguntar a Copilot"}</span>
                  </button>

                  {/* Instant action trigger */}
                  {adminSection === "products" && !isNewProductMode && !editingProduct && (
                    <button
                      onClick={() => {
                        setEditingProduct(null);
                        setNewProductErrors({});
                        const nextSku = getNextAutoSKU(store.products);
                        setNewProduct({
                          codigo: nextSku,
                          name: "",
                          description: "",
                          price: 0,
                          originalPrice: undefined,
                          category: (store.dbCategories || [])[0]?.nombre || store.categories[0] || "",
                          categoria_id: (store.dbCategories || [])[0]?.id || "",
                          subcategoria_id: "all",
                          imageUrl: "",
                          stock: 0,
                          featured: false,
                          precioCompra: 0,
                          precioCon40: 0,
                          comisionML: 0,
                          precioVentaML: 0,
                          precioWeb: 0,
                          descuentoPorcentaje: 0,
                          stockPinamar: 0,
                          stockMontevideo: 0,
                          stockTotalActual: 0
                        });
                        setIsNewProductMode(true);
                      }}
                      className="px-5 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center gap-1.5 text-xs shadow-md shadow-blue-500/10 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Crea Nuevo Producto</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ERROR STATS BAR IF ANY */}
            {syncStatus === "error" && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Error de comunicación. Haz click en Guardar Cambios para forzar sincronía.</span>
              </div>
            )}

            {/* DYNAMIC SECTIONS GRID */}
            {adminSection === "dashboard" ? (
              <DashboardGeneral
                store={store}
                navigateAdminSection={navigateAdminSection}
                setStockFilterTab={setStockFilterTab}
                setIsNewProductMode={setIsNewProductMode}
                setEditingProduct={(p) => setEditingProduct(prepareProductForEditing(p as any))}
              />
            ) : adminSection === "sales" ? (
              <DashboardOrders
                store={store}
                onUpdateStatus={async (id, newStatus) => {
                  try {
                    const response = await fetch(`/api/orders/${id}/status`, {
                      method: "PUT",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
                      },
                      body: JSON.stringify({ status: newStatus })
                    });
                    const d = await response.json();
                    if (response.ok && d.success) {
                      showAdminToast("Estado de pedido actualizado correctamente.", "success");
                      // Dynamically set state in store to prevent full refresh lag
                      setStore(prev => {
                        const targetOrder = (prev.orders || []).find(o => o.id === id);
                        const oldStatus = targetOrder ? targetOrder.status : "";
                        let updatedProducts = prev.products || [];
                        if (newStatus === "pago_aprobado" && oldStatus !== "pago_aprobado" && targetOrder && targetOrder.items) {
                          updatedProducts = deductProductsStockClient(prev.products || [], targetOrder.items, targetOrder.depositoOrigen || "Pinamar");
                        }
                        return {
                          ...prev,
                          orders: (prev.orders || []).map(o => o.id === id ? { ...o, status: newStatus } : o),
                          products: updatedProducts
                        };
                      });
                    } else {
                      showAdminToast(d.message || "Error al actualizar estado.", "error");
                    }
                  } catch (err) {
                    showAdminToast("Error de conexión al guardar el estado del pedido.", "error");
                  }
                }}
                onDeleteOrder={async (id) => {
                  try {
                    const response = await fetch(`/api/orders/${id}`, {
                      method: "DELETE",
                      headers: {
                        "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
                      }
                    });
                    const d = await response.json();
                    if (response.ok && d.success) {
                      showAdminToast("Pedido eliminado correctamente.", "success");
                      // Dynamically remove from local store state
                      setStore(prev => ({
                        ...prev,
                        orders: (prev.orders || []).filter(o => o.id !== id)
                      }));
                    } else {
                      showAdminToast(d.message || "Error al eliminar el pedido.", "error");
                    }
                  } catch (err) {
                    showAdminToast("Error de conexión al eliminar el pedido.", "error");
                  }
                }}
                onOrderCreated={(newOrder) => {
                  showAdminToast("Venta manual registrada con éxito.", "success");
                  setStore(prev => {
                    const updatedOrders = [newOrder, ...(prev.orders || [])];
                    let updatedProducts = prev.products || [];
                    if (newOrder.status === "pago_aprobado" && newOrder.items) {
                      updatedProducts = deductProductsStockClient(prev.products || [], newOrder.items, newOrder.depositoOrigen || "Pinamar");
                    }
                    return {
                      ...prev,
                      orders: updatedOrders,
                      products: updatedProducts
                    };
                  });
                }}
              />
            ) : adminSection === "bills" ? (
              <DashboardBills
                store={store}
                onAddBill={(newBill) => {
                  showAdminToast("Boleta registrada con éxito.", "success");
                  setStore(prev => ({
                    ...prev,
                    bills: [newBill, ...(prev.bills || [])]
                  }));
                }}
                onDeleteBill={async (id) => {
                  try {
                    const response = await fetch(`/api/bills/${id}`, {
                      method: "DELETE",
                      headers: {
                        "Authorization": `Bearer ${localStorage.getItem("apex_admin_token")}`
                      }
                    });
                    const d = await response.json();
                    if (response.ok && d.success) {
                      showAdminToast("Boleta eliminada correctamente.", "success");
                      setStore(prev => ({
                        ...prev,
                        bills: (prev.bills || []).filter(b => b.id !== id)
                      }));
                    } else {
                      showAdminToast(d.message || "Error al eliminar la boleta.", "error");
                    }
                  } catch (err) {
                    showAdminToast("Error de conexión al eliminar la boleta.", "error");
                  }
                }}
              />
            ) : adminSection === "finances" ? (
              <DashboardResumenGeneral
                store={store}
              />
            ) : adminSection === "shippings" ? (
              <DashboardShippings
                store={store}
                onAddShipping={(newShip) => {
                  setStore(prev => ({
                    ...prev,
                    shippings: [newShip, ...(prev.shippings || [])]
                  }));
                  showAdminToast("Envío registrado correctamente.", "success");
                }}
                onUpdateShipping={(updatedShip) => {
                  setStore(prev => ({
                    ...prev,
                    shippings: (prev.shippings || []).map(s => s.id === updatedShip.id ? updatedShip : s)
                  }));
                  showAdminToast("Envío actualizado correctamente.", "success");
                }}
                onDeleteShipping={(id) => {
                  setStore(prev => ({
                    ...prev,
                    shippings: (prev.shippings || []).filter(s => s.id !== id)
                  }));
                  showAdminToast("Envío eliminado correctamente.", "success");
                }}
                onUpdateOrigins={(updatedOrigins) => {
                  setStore(prev => ({
                    ...prev,
                    shippingOrigins: updatedOrigins
                  }));
                  showAdminToast("Remitentes actualizados correctamente.", "success");
                }}
              />
            ) : (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* SECTION A: THE PRINCIPAL CONTROL FORM */}
              <div className="lg:col-span-12 space-y-4">
                
                {/* 1. GENERAL & BRANDING EDITOR */}
                {adminSection === "general" && (
                  <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                      <Palette className="h-4 w-4 theme-text-primary" />
                      <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-200">Diseño & Textos de Tienda</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Nombre del eCommerce</label>
                        <input
                          type="text"
                          value={editingSettings.siteTitle}
                          onChange={(e) => setEditingSettings({ ...editingSettings, siteTitle: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">WhatsApp Oficial (Teléfono código país completo)</label>
                        <input
                          type="text"
                          value={editingSettings.whatsappNumber}
                          onChange={(e) => setEditingSettings({ ...editingSettings, whatsappNumber: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                          placeholder="p.ej. 5491123456789"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Descripción de Tienda / Eslogan</label>
                      <input
                        type="text"
                        value={editingSettings.siteSubtitle}
                        onChange={(e) => setEditingSettings({ ...editingSettings, siteSubtitle: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Velocidad de Giro (Destacados)</label>
                      <select
                        value={editingSettings.featuredSliderSpeed !== undefined ? editingSettings.featuredSliderSpeed : 2500}
                        onChange={(e) => setEditingSettings({ ...editingSettings, featuredSliderSpeed: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                      >
                        <option value={1500}>Muy Rápido (1.5 segundos)</option>
                        <option value={2500}>Rápido (2.5 segundos)</option>
                        <option value={4000}>Normal (4 segundos)</option>
                        <option value={6000}>Lento (6 segundos)</option>
                        <option value={0}>Pausa (Sin rotación automática)</option>
                      </select>
                    </div>

                    {/* Logo Configurator inside store general settings */}
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/30 space-y-3">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                          Logo de la Web
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Tipo de Logo</label>
                          <select
                            value={editingSettings.logoType || "text"}
                            onChange={(e) => setEditingSettings({ ...editingSettings, logoType: e.target.value as 'text' | 'image' })}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                          >
                            <option value="text">Texto / Iniciales (Por defecto)</option>
                            <option value="image">Imagen por URL (Personalizada)</option>
                          </select>
                        </div>

                        {editingSettings.logoType === "image" ? (
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">URL de la Imagen del Logo</label>
                            <input
                              type="text"
                              value={editingSettings.logoImageUrl || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, logoImageUrl: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                              placeholder="https://ejemplo.com/logo.png"
                            />
                            
                            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-900/40 border border-slate-200/50 dark:border-zinc-800/40 mt-1">
                              <span className="text-[9px] font-semibold text-slate-500 dark:text-zinc-400">Sincronizar Logo con Cloudinary:</span>
                              <label 
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-bold text-[9px] cursor-pointer transition-all shadow-xs select-none ${
                                  uploadingLogo 
                                    ? "bg-slate-105 dark:bg-zinc-800 text-zinc-500 pointer-events-none animate-pulse" 
                                    : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white"
                                }`}
                              >
                                {uploadingLogo ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin text-[#5346ff]" />
                                    <span>Subiendo...</span>
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-2.5 h-2.5" />
                                    <span>Subir Imagen</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingLogo}
                                  onChange={async (e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      const file = e.target.files[0];
                                      const formData = new FormData();
                                      formData.append("image", file);
                                      try {
                                        setUploadingLogo(true);
                                        const uploadRes = await fetch("/api/cloudinary/upload", {
                                          method: "POST",
                                          headers: {
                                            "Authorization": `Bearer ${localStorage.getItem("apex_admin_token") || ""}`
                                          },
                                          body: formData,
                                        });
                                        const resText = await uploadRes.text();
                                        let parsedData: any = null;
                                        try { parsedData = JSON.parse(resText); } catch (pErr) {}
                                        if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
                                          setEditingSettings({ ...editingSettings, logoImageUrl: parsedData.url });
                                          showToast("¡Logo subido e integrado con éxito! 🎨", "success");
                                        } else {
                                          showToast((parsedData && parsedData.message) || "Error al subir logotipo.", "error");
                                        }
                                      } catch (err) {
                                        showToast("Fallo al conectar con Cloudinary.", "error");
                                      } finally {
                                        setUploadingLogo(false);
                                      }
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Letra / Icono (Máx 3 carac.)</label>
                            <input
                              type="text"
                              maxLength={3}
                              value={editingSettings.logoText || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, logoText: e.target.value })}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                              placeholder="J"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Live Preview of logo in settings */}
                      <div className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-950/45 border border-dashed border-slate-200 dark:border-zinc-800 rounded-lg">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vista Previa:</span>
                        <div className="flex items-center gap-2">
                          {editingSettings.logoType === "image" && !!editingSettings.logoImageUrl ? (
                            <img
                              src={editingSettings.logoImageUrl || null}
                              alt="Vista Previa Logo"
                              className="w-8 h-8 rounded-xl object-cover shadow-sm bg-zinc-950/25"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=100&q=80";
                              }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 theme-btn-primary rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                              {editingSettings.logoText || "J"}
                            </div>
                          )}
                          <span className="font-bold text-xs text-slate-900 dark:text-zinc-200">
                            {editingSettings.siteTitle || "Tu Tienda"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="py-2.5 px-6 bg-blue-600 text-white rounded-lg font-semibold text-xs transition-all hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Save className="h-4 w-4" />
                        <span>{saving ? "Guardando..." : "Guardar Personalización"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {adminSection === "banner" && (
                  <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                      <Image className="h-4 w-4 theme-text-primary" />
                      <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-200 font-sans">Banners del Carrusel de Tienda</h3>
                    </div>

                    {/* Carousel Slides Manager in Admin Section */}
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/30 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-705 dark:text-zinc-300">
                          Imágenes y Textos del Carrusel (Slider)
                        </h4>
                        <span className="text-[10px] text-zinc-400">
                          {(editingSettings.heroSlides?.length || 3)} diapositivas activas
                        </span>
                      </div>

                      <div className="space-y-4">
                        {/* Loop through each slide for configuration */}
                        {((editingSettings.heroSlides && editingSettings.heroSlides.length > 0) 
                          ? editingSettings.heroSlides 
                          : [
                              {
                                id: "slide-1",
                                title: editingSettings.bannerTitle || "Colección Exclusiva de Primavera",
                                subtitle: editingSettings.bannerSubtitle || "Descubre las últimas tendencias con descuentos de hasta el 40%.",
                                imageUrl: editingSettings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
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
                            ]
                        ).map((slide, idx) => {
                          // Helper handler updates editingSettings list inline
                          const updateSlideField = (field: "title" | "subtitle" | "imageUrl" | "buttonText" | "buttonLink", value: string) => {
                            const currentSlides = editingSettings.heroSlides && editingSettings.heroSlides.length > 0
                              ? [...editingSettings.heroSlides]
                              : [
                                  {
                                    id: "slide-1",
                                    title: editingSettings.bannerTitle || "Colección Exclusiva de Primavera",
                                    subtitle: editingSettings.bannerSubtitle || "Descubre las últimas tendencias con descuentos de hasta el 40%.",
                                    imageUrl: editingSettings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
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

                            // Ensure slide exists in range
                            if(!currentSlides[idx]) {
                              currentSlides[idx] = { id: `slide-${Date.now()}`, title: "", subtitle: "", imageUrl: "" };
                            }
                            currentSlides[idx] = { ...currentSlides[idx], [field]: value };

                            // Also sync the first slide defaults to the old legacy root banner fields just in case
                            const nextSettings = { ...editingSettings, heroSlides: currentSlides };
                            if (idx === 0) {
                              if (field === "title") nextSettings.bannerTitle = value;
                              if (field === "subtitle") nextSettings.bannerSubtitle = value;
                              if (field === "imageUrl") nextSettings.bannerImageUrl = value;
                            }
                            setEditingSettings(nextSettings);
                          };

                          const removeSlide = () => {
                            const currentSlides = editingSettings.heroSlides && editingSettings.heroSlides.length > 0
                              ? [...editingSettings.heroSlides]
                              : [
                                  {
                                    id: "slide-1",
                                    title: editingSettings.bannerTitle || "Colección Exclusiva de Primavera",
                                    subtitle: editingSettings.bannerSubtitle || "Descubre las últimas tendencias con descuentos de hasta el 40%.",
                                    imageUrl: editingSettings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
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
                            if (currentSlides.length <= 1) {
                              alert("Debes mantener al menos una diapositiva.");
                              return;
                            }
                            const filtered = currentSlides.filter((_, sIdx) => sIdx !== idx);
                            
                            const nextSettings = { ...editingSettings, heroSlides: filtered };
                            // Sync legacy if first was removed
                            if (filtered[0]) {
                              nextSettings.bannerTitle = filtered[0].title;
                              nextSettings.bannerSubtitle = filtered[0].subtitle;
                              nextSettings.bannerImageUrl = filtered[0].imageUrl;
                            }
                            setEditingSettings(nextSettings);
                          };

                          return (
                            <div key={slide.id || idx} className="p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg space-y-3 relative shadow-inner">
                              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-400">
                                <span>Diapositiva #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={removeSlide}
                                  className="text-red-400 hover:text-red-500 transition-colors text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Eliminar</span>
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Título de la Diapositiva</label>
                                  <input
                                    type="text"
                                    value={slide.title}
                                    onChange={(e) => updateSlideField("title", e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    placeholder="ej: Ofertas Exclusivas de Invierno"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Subtítulo de la Diapositiva</label>
                                  <input
                                    type="text"
                                    value={slide.subtitle}
                                    onChange={(e) => updateSlideField("subtitle", e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                    placeholder="ej: Descuentos de hasta un 30% en toda la tienda"
                                  />
                                </div>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                                    Imagen del Banner (URL o Subir)
                                  </label>
                                  <span className="text-[10px] text-[#5346ff] font-medium">
                                    Recomendado: 1920x800 píxeles
                                  </span>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={slide.imageUrl}
                                      onChange={(e) => updateSlideField("imageUrl", e.target.value)}
                                      className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                                      placeholder="URL de la imagen (ej: https://images.unsplash.com/...)"
                                    />
                                    {!!slide.imageUrl && (
                                      <div className="relative group/mini duration-150 shrink-0">
                                        <img 
                                          src={slide.imageUrl || null} 
                                          alt="mini previsualizacion de slide" 
                                          className="h-8 w-16 object-cover rounded bg-zinc-800 border border-zinc-700/50"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/mini:opacity-100 transition-opacity rounded flex items-center justify-center">
                                          <Eye 
                                            className="w-3 h-3 text-white cursor-pointer" 
                                            onClick={() => {
                                              window.open(slide.imageUrl, "_blank");
                                            }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between p-2 rounded-lg bg-slate-100/60 dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/40">
                                    <div className="space-y-0.5 max-w-sm">
                                      <p className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                                        Subir directamente a Cloudinary:
                                      </p>
                                      <p className="text-[9px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                                        Las fotos grandes de paisajes (16:9 o 21:9) lucen más nítidas e impactantes. Te aconsejamos usar imágenes optimizadas de aproximadamente <strong>1920 x 800 píxeles</strong>.
                                      </p>
                                    </div>
                                    
                                    <div className="shrink-0 w-full sm:w-auto flex items-center justify-end">
                                      <label 
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded font-medium text-[10px] cursor-pointer transition-all shadow-sm select-none ${
                                          uploadingSlideIdx === idx 
                                            ? "bg-slate-100 dark:bg-zinc-800 text-zinc-500 pointer-events-none" 
                                            : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white"
                                        }`}
                                      >
                                        {uploadingSlideIdx === idx ? (
                                          <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5346ff]" />
                                            <span className="font-mono">Subiendo...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-3 h-3" />
                                            <span>Seleccionar Archivo</span>
                                          </>
                                        )}
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          disabled={uploadingSlideIdx === idx}
                                          onChange={async (e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              const file = e.target.files[0];
                                              const formData = new FormData();
                                              formData.append("image", file);
                                              
                                              try {
                                                setUploadingSlideIdx(idx);
                                                const uploadRes = await fetch("/api/cloudinary/upload", {
                                                  method: "POST",
                                                  headers: {
                                                    "Authorization": `Bearer ${localStorage.getItem("apex_admin_token") || ""}`
                                                  },
                                                  body: formData,
                                                });
                                                
                                                const resText = await uploadRes.text();
                                                let parsedData: any = null;
                                                
                                                if (resText.trim().startsWith("<!doctype") || resText.trim().startsWith("<html")) {
                                                  showToast("El servidor de subidas no pudo procesar el archivo. Comprueba que tus ajustes de Cloudinary sean correctos.", "error");
                                                  return;
                                                }
                                                
                                                try {
                                                  parsedData = JSON.parse(resText);
                                                } catch (pErr) {
                                                  console.error("Error al parsear respuesta JSON:", pErr);
                                                }

                                                if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
                                                  updateSlideField("imageUrl", parsedData.url);
                                                  showToast("¡Imagen del slider subida con éxito! ✨", "success");
                                                } else {
                                                  showToast((parsedData && parsedData.message) || "Ocurrió un error al subir a Cloudinary.", "error");
                                                }
                                              } catch (err) {
                                                console.error(err);
                                                showToast("Fallo al conectar con la API de Cloudinary.", "error");
                                              } finally {
                                                setUploadingSlideIdx(null);
                                              }
                                            }
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Quick Unsplash selector for this slide */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800">
                                  <div>
                                    <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                      Texto del Botón (Opcional)
                                    </label>
                                    <input
                                      type="text"
                                      value={slide.buttonText || ""}
                                      onChange={(e) => updateSlideField("buttonText", e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                      placeholder="ej: Explorar Catálogo (Por defecto)"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                      Direccionar Botón a (Enlace / Categoría / Producto)
                                    </label>
                                    <div className="flex gap-1.5 col-span-1">
                                      <select
                                        value={
                                          slide.buttonLink?.startsWith("category:") 
                                            ? "category" 
                                            : slide.buttonLink?.startsWith("subcategory:") 
                                              ? "subcategory" 
                                              : slide.buttonLink?.startsWith("product:") 
                                                ? "product" 
                                                : slide.buttonLink?.startsWith("http") 
                                                  ? "external" 
                                                  : "custom"
                                        }
                                        onChange={(e) => {
                                          const type = e.target.value;
                                          if (type === "category") {
                                            const firstCat = (store.dbCategories || [])[0]?.nombre || "todos";
                                            updateSlideField("buttonLink", `category:${firstCat}`);
                                          } else if (type === "subcategory") {
                                            const firstSub = (store.dbSubcategories || [])[0]?.id || "";
                                            updateSlideField("buttonLink", `subcategory:${firstSub}`);
                                          } else if (type === "product") {
                                            const firstProd = store.products[0]?.id || "";
                                            updateSlideField("buttonLink", `product:${firstProd}`);
                                          } else if (type === "external") {
                                            updateSlideField("buttonLink", "https://");
                                          } else {
                                            updateSlideField("buttonLink", "");
                                          }
                                        }}
                                        className="px-2 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                      >
                                        <option value="custom">Manual / Ninguno</option>
                                        <option value="category">Categoría</option>
                                        <option value="subcategory">Subcategoría</option>
                                        <option value="product">Producto</option>
                                        <option value="external">Enlace Externo</option>
                                      </select>
                                      
                                      {slide.buttonLink?.startsWith("category:") ? (
                                        <select
                                          value={slide.buttonLink.replace("category:", "")}
                                          onChange={(e) => updateSlideField("buttonLink", `category:${e.target.value}`)}
                                          className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer animate-fade-in"
                                        >
                                          <option value="todos">Todos los Productos</option>
                                          {(store.dbCategories || []).map((cat) => (
                                            <option key={cat.id} value={cat.nombre}>
                                              {cat.nombre}
                                            </option>
                                          ))}
                                        </select>
                                      ) : slide.buttonLink?.startsWith("subcategory:") ? (
                                        <select
                                          value={slide.buttonLink.replace("subcategory:", "")}
                                          onChange={(e) => updateSlideField("buttonLink", `subcategory:${e.target.value}`)}
                                          className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer animate-fade-in"
                                        >
                                          {(store.dbSubcategories || []).map((sub) => (
                                            <option key={sub.id} value={sub.id}>
                                              {sub.nombre} ({ (store.dbCategories || []).find(c => c.id === sub.categoria_id)?.nombre || "Sin cat" })
                                            </option>
                                          ))}
                                        </select>
                                      ) : slide.buttonLink?.startsWith("product:") ? (
                                        <div className="flex-1 flex flex-col gap-1.5 animate-fade-in col-span-1">
                                          <div className="flex gap-1.5">
                                            <input
                                              type="text"
                                              value={bannerProductSearch}
                                              onChange={(e) => setBannerProductSearch(e.target.value)}
                                              placeholder="🔍 Buscar producto..."
                                              className="w-full px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200/60 dark:bg-zinc-800 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                                            />
                                            {bannerProductSearch && (
                                              <button
                                                type="button"
                                                onClick={() => setBannerProductSearch("")}
                                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded text-[10px] font-bold"
                                              >
                                                Borrar
                                              </button>
                                            )}
                                          </div>
                                          
                                          <select
                                            value={slide.buttonLink.replace("product:", "")}
                                            onChange={(e) => updateSlideField("buttonLink", `product:${e.target.value}`)}
                                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                          >
                                            <option value="">-- Seleccionar producto --</option>
                                            {store.products
                                              .filter(p => !bannerProductSearch || p.name.toLowerCase().includes(bannerProductSearch.toLowerCase()) || p.category?.toLowerCase().includes(bannerProductSearch.toLowerCase()))
                                              .map((p) => (
                                                <option key={p.id} value={p.id}>
                                                  {p.name} (${Number(p.price || 0).toFixed(2)})
                                                </option>
                                              ))}
                                          </select>
                                          
                                          <span className="text-[9px] text-zinc-400 italic">
                                            {store.products.filter(p => !bannerProductSearch || p.name.toLowerCase().includes(bannerProductSearch.toLowerCase()) || p.category?.toLowerCase().includes(bannerProductSearch.toLowerCase())).length} de {store.products.length} productos en lista
                                          </span>
                                        </div>
                                      ) : (
                                        <input
                                          type="text"
                                          value={slide.buttonLink || ""}
                                          onChange={(e) => updateSlideField("buttonLink", e.target.value)}
                                          className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono"
                                          placeholder="ej: #catalog-view o URL completa"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Button to append a brand new slide */}
                        <button
                          type="button"
                          onClick={() => {
                            const currentSlides = editingSettings.heroSlides && editingSettings.heroSlides.length > 0
                              ? [...editingSettings.heroSlides]
                              : [
                                  {
                                    id: "slide-1",
                                    title: editingSettings.bannerTitle || "Colección Exclusiva de Primavera",
                                    subtitle: editingSettings.bannerSubtitle || "Descubre las últimas tendencias con descuentos de hasta el 40%.",
                                    imageUrl: editingSettings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80"
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
                            
                            const newSlideId = `slide-${Date.now()}`;
                            currentSlides.push({
                              id: newSlideId,
                              title: "Nueva Ofertas " + (currentSlides.length + 1),
                              subtitle: "Descripción rápida del beneficio, promoción o temporada.",
                              imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80"
                            });
                            setEditingSettings({ ...editingSettings, heroSlides: currentSlides });
                          }}
                          className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-zinc-800 hover:border-blue-500/50 hover:bg-white dark:hover:bg-zinc-900/60 rounded-xl text-xs font-semibold text-slate-500 dark:text-zinc-400 hover:text-blue-500 dark:hover:text-amber-400 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Añadir Nueva Diapositiva al Slider</span>
                        </button>
                      </div>
                    </div>

                    {/* Ajuste de Opacidad del Banner General */}
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/50 dark:bg-zinc-900/30 space-y-3.5">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
                        <Palette className="h-4 w-4 text-blue-500" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-705 dark:text-zinc-300">
                          Diseño y Opacidad del Banner
                        </h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
                              Opacidad de las Imágenes del Carrusel
                            </label>
                            <p className="text-[10px] text-zinc-400 mt-0.5 max-w-xl">
                              Ajusta la luminosidad de las imágenes de fondo en el carrusel de inicio. Un porcentaje menor oscurece la imagen para destacar el texto blanco; un porcentaje mayor hace el fondo más claro y visible.
                            </p>
                          </div>
                          <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg shrink-0 self-start sm:self-center">
                            {editingSettings.bannerOpacity !== undefined ? editingSettings.bannerOpacity : 35}%
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-4 py-1">
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Más Oscuro (10%)</span>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="5"
                            value={editingSettings.bannerOpacity !== undefined ? editingSettings.bannerOpacity : 35}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setEditingSettings({
                                ...editingSettings,
                                bannerOpacity: val
                              });
                            }}
                            className="flex-1 cursor-pointer accent-blue-600 dark:accent-blue-500 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none outline-none"
                          />
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Más Claro (100%)</span>
                        </div>

                        <div className="border-t border-slate-200 dark:border-zinc-800/60 pt-3.5 mt-3 space-y-2">
                          <label className="block text-xs font-bold text-slate-800 dark:text-zinc-200">
                            Estilo de Transición del Carrusel (Slider)
                          </label>
                          <p className="text-[10px] text-zinc-400 mt-0.5 max-w-xl">
                            Selecciona el efecto de transición visual cuando cambia el banner en la página principal. Todos los efectos están optimizados para evitar temblores.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5">
                            {[
                              { label: "Desplazar ↔", value: "slide" },
                              { label: "Desvanecer ✧", value: "fade" },
                              { label: "Zoom-in ☉", value: "zoom" },
                              { label: "Desplazar ↕", value: "slide-up" }
                            ].map((opt) => {
                              const active = (editingSettings.heroSliderTransition || "slide") === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => {
                                    setEditingSettings({
                                      ...editingSettings,
                                      heroSliderTransition: opt.value as any
                                    });
                                  }}
                                  className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all text-center cursor-pointer ${
                                    active
                                      ? "bg-blue-600/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/55 font-black shadow-sm"
                                      : "bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-350 dark:hover:border-zinc-700 hover:text-slate-800 dark:hover:text-zinc-300"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="py-2.5 px-6 bg-blue-600 text-white rounded-lg font-semibold text-xs transition-all hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Save className="h-4 w-4" />
                        <span>{saving ? "Guardando..." : "Guardar Carrusel"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {adminSection === "footer" && (
                  <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 animate-fade-in">
                    <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                      <Layout className="h-4 w-4 theme-text-primary" />
                      <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-200 font-sans">Información del Pie de Página (Footer)</h3>
                    </div>

                    {/* Footer Customizer Card */}
                    <div className="border border-slate-200 dark:border-zinc-800 rounded-xl p-4 bg-slate-50/55 dark:bg-zinc-900/40 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-zinc-800 pb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                          Personalización del Pie de Página (Footer)
                        </span>
                      </div>

                      <div className="space-y-4">
                        {/* Columna 1 */}
                        <div className="p-3 bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                          <label className="block text-[10px] font-black text-blue-500 uppercase tracking-widest">Columna 1: Información de Envío o Compra</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-1">Título</label>
                              <input
                                type="text"
                                value={editingSettings.footerCol1Title || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, footerCol1Title: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                placeholder="🚀 Compra Personalizada"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-1">Descripción corta o Detalles</label>
                              <textarea
                                value={editingSettings.footerCol1Text || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, footerCol1Text: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white h-[68px] resize-none"
                                placeholder="Detalles de compra personalizada o envíos..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Columna 2 */}
                        <div className="p-3 bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2.5">
                          <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest">Columna 2: Calidad o Garantía</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="md:col-span-1">
                              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-1">Título</label>
                              <input
                                type="text"
                                value={editingSettings.footerCol2Title || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, footerCol2Title: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                placeholder="🌟 Calidad Asegurada"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-[9px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-1">Descripción corta o Políticas</label>
                              <textarea
                                value={editingSettings.footerCol2Text || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, footerCol2Text: e.target.value })}
                                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white h-[68px] resize-none"
                                placeholder="Políticas de cambio de talle, calidad..."
                              />
                            </div>
                          </div>
                        </div>

                        {/* Columna 3 - Mapa e Ubicación */}
                        <div className="p-3 bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2">
                          <label className="block text-[10px] font-black text-[#D4A55A] uppercase tracking-widest">Columna 3: Ubicación y Mapa Interactivo</label>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">
                            Esta sección del pie de página ha sido optimizada permanentemente para mostrar el <strong>Mapa de Google Maps interactivo de Juem</strong>. Esto genera mayor credibilidad de marca, profesionalidad y ayuda a tus clientes a visitarte más rápido.
                          </p>
                        </div>

                        {/* Copyright */}
                        <div className="p-3 bg-white dark:bg-zinc-950/70 border border-slate-200 dark:border-zinc-800 rounded-xl">
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Texto del Copyright (Derechos Reservados)</label>
                          <input
                            type="text"
                            value={editingSettings.footerCopyright || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, footerCopyright: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                            placeholder="Desarrollado con tecnología de punta responsive. Reservados todos los derechos."
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="py-2.5 px-6 bg-blue-600 text-white rounded-lg font-semibold text-xs transition-colors hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Save className="h-4 w-4" />
                        <span>{saving ? "Guardando..." : "Guardar Pie de Página"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Colors section remains combined with general branding */}
                {adminSection === "general" && (
                  <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4 animate-fade-in mt-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                      <Palette className="h-4 w-4 theme-text-primary" />
                      <h3 className="font-bold text-sm text-slate-950 dark:text-zinc-200 font-sans">Paleta de Colores de Tienda y Tematización</h3>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Color Primario</label>
                        <div className="flex gap-1.5">
                          <input
                            type="color"
                            value={editingSettings.primaryColor}
                            onChange={(e) => setEditingSettings({ ...editingSettings, primaryColor: e.target.value })}
                            className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={editingSettings.primaryColor}
                            onChange={(e) => setEditingSettings({ ...editingSettings, primaryColor: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Color Acento</label>
                        <div className="flex gap-1.5">
                          <input
                            type="color"
                            value={editingSettings.accentColor}
                            onChange={(e) => setEditingSettings({ ...editingSettings, accentColor: e.target.value })}
                            className="h-8 w-8 rounded cursor-pointer border-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={editingSettings.accentColor}
                            onChange={(e) => setEditingSettings({ ...editingSettings, accentColor: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-xs font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Tema Predeterminado</label>
                        <select
                          value={editingSettings.themeMode}
                          onChange={(e) => setEditingSettings({ ...editingSettings, themeMode: e.target.value as 'dark' | 'light' })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white"
                        >
                          <option value="dark">Immersive Dark Mode</option>
                          <option value="light">Clean Light Mode</option>
                        </select>
                      </div>
                    </div>

                    {/* Preloaded visual default themes for fast customization */}
                    <div className="border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-zinc-300">
                        <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Temas Predeterminados (Haz click para aplicar)</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {THEME_PRESETS.map((preset) => {
                          const isSelected = 
                            editingSettings.primaryColor.toLowerCase() === preset.primaryColor.toLowerCase() &&
                            editingSettings.accentColor.toLowerCase() === preset.accentColor.toLowerCase() &&
                            editingSettings.themeMode === preset.themeMode;
                          
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                setEditingSettings({
                                  ...editingSettings,
                                  primaryColor: preset.primaryColor,
                                  accentColor: preset.accentColor,
                                  themeMode: preset.themeMode
                                });
                                showAdminToast(`Tema "${preset.name}" seleccionado temporalmente.`, "success");
                              }}
                              className={`p-2 border rounded-xl text-left transition cursor-pointer flex flex-col gap-1.5 relative overflow-hidden group ${
                                isSelected 
                                  ? "bg-white dark:bg-zinc-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/30" 
                                  : "bg-white/80 dark:bg-zinc-900/20 border-slate-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-900/60 hover:border-zinc-400 dark:hover:border-zinc-700"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-1">
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: preset.primaryColor }}></span>
                                  <span className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10" style={{ backgroundColor: preset.accentColor }}></span>
                                </div>
                                <span className={`text-[7px] px-1 py-0.2 rounded font-extrabold tracking-wider uppercase ${
                                  preset.themeMode === 'dark' 
                                    ? 'bg-zinc-800 text-zinc-400 border border-zinc-800' 
                                    : 'bg-zinc-100 text-zinc-600 border border-slate-200'
                                }`}>
                                  {preset.themeMode === 'dark' ? "Oscuro" : "Claro"}
                                </span>
                              </div>
                              <span className="text-[10px] font-bold text-slate-800 dark:text-zinc-200 truncate group-hover:text-blue-500 transition-colors">
                                {preset.name}
                              </span>
                              {isSelected && (
                                <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-500 rounded-bl-lg flex items-center justify-center">
                                  <span className="text-[6px] text-white font-extrabold">✓</span>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Luxurious Info Card: Colores Juem & Style Specifications */}
                    <div className="border border-[#D4A55A]/30 bg-[#050B1A] p-6 rounded-2xl text-[#F4EAD7] space-y-6 mt-4 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D4A55A]/20 pb-4">
                        <div>
                          <h4 className="font-serif text-lg font-bold tracking-tight text-[#E6BF76] flex items-center gap-2">
                            Colores Juem 🎨
                          </h4>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-[#D4A55A]/80 mt-1">
                            Especificación de Alta Costura y Lujo Editorial
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSettings({
                              ...editingSettings,
                              primaryColor: "#D4A55A",
                              accentColor: "#E6BF76",
                              themeMode: "dark"
                            });
                            showAdminToast('Tema "Colores Juem 🎨" seleccionado temporalmente.', "success");
                          }}
                          className="py-2 px-4 rounded-xl border border-[#D4A55A] bg-[#D4A55A]/10 text-[#E6BF76] hover:bg-[#D4A55A] hover:text-[#050B1A] transition text-[11px] font-extrabold uppercase tracking-widest active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-center"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Aplicar Tema Juem</span>
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-2">
                            🎨 Paleta de Colores Aplicados en la Web
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 rounded-xl border border-zinc-900 bg-[#0B1730]/40 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#050B1A] border border-zinc-700"></span>
                                <span className="font-bold text-[#E6BF76] font-mono">#050B1A</span>
                              </div>
                              <p className="font-medium text-slate-200">Fondo Principal (Azul Profundo)</p>
                              <p className="text-[10px] text-zinc-400">Fondo del sitio o de la página, pie de página y fondos principales de desplegables.</p>
                            </div>

                            <div className="p-3 rounded-xl border border-zinc-900 bg-[#0B1730]/40 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#0B1730] border border-zinc-700"></span>
                                <span className="font-bold text-[#E6BF76] font-mono">#0B1730</span>
                              </div>
                              <p className="font-medium text-slate-200">Fondo Secundario (Azul Cobalto Oscuro)</p>
                              <p className="text-[10px] text-zinc-400">Tarjetas de producto, contenedor de carrito, inputs y botones inactivos de menú.</p>
                            </div>

                            <div className="p-3 rounded-xl border border-zinc-900 bg-[#0B1730]/40 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#D4A55A] border border-black/10"></span>
                                <span className="font-bold text-[#E6BF76] font-mono">#D4A55A</span>
                              </div>
                              <p className="font-medium text-slate-200">Dorado Principal (Accent Gold)</p>
                              <p className="text-[10px] text-zinc-400">Botones principales, categorías activas, precio seleccionado y acentos decorativos.</p>
                            </div>

                            <div className="p-3 rounded-xl border border-zinc-900 bg-[#0B1730]/40 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#E6BF76] border border-black/10"></span>
                                <span className="font-bold text-[#E6BF76] font-mono">#E6BF76</span>
                              </div>
                              <p className="font-medium text-slate-200">Dorado Arena (Light Gold)</p>
                              <p className="text-[10px] text-zinc-400">Enlaces interactivos, subtextos destacados, indicador activo de talles.</p>
                            </div>

                            <div className="p-3 rounded-xl border border-zinc-900 bg-[#0B1730]/40 space-y-1 col-span-1 md:col-span-2">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-[#F4EAD7] border border-zinc-400"></span>
                                <span className="font-bold text-[#E6BF76] font-mono">#F4EAD7</span>
                              </div>
                              <p className="font-medium text-slate-200">Blanco Crema Elegante</p>
                              <p className="text-[10px] text-zinc-400">Títulos principales de sección, títulos de productos en portada y textos esenciales.</p>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-[#D4A55A]/10 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E6BF76] block mb-2">
                              ✍️ Estilo de Tipografía (Letras)
                            </span>
                            <ul className="text-xs space-y-2 text-zinc-300">
                              <li>
                                <strong className="text-[#F4EAD7] font-serif">Tipografía Display / Serif:</strong> Utilizada en títulos principales, cabeceras del carrusel y título de tu marca para transmitir elegancia y prestigio de alta gama.
                              </li>
                              <li>
                                <strong className="text-[#F4EAD7] font-sans">Tipografía Sans (Inter):</strong> Para cuerpo de texto, descripciones del producto, botones de compra y tablas de medidas, garantizando legibilidad perfecta.
                              </li>
                              <li>
                                <strong className="text-[#F4EAD7] font-mono text-[10px]">Tipografía Mono (JetBrains Mono):</strong> Reservada para números de transacciones, códigos de cupones y medidas exactas de talles.
                              </li>
                            </ul>
                          </div>

                          <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#E6BF76] block mb-2">
                              ✨ Interacciones y Hover de Menú Aplicados
                            </span>
                            <ul className="text-xs space-y-2 text-zinc-300">
                              <li>
                                <strong className="text-[#F4EAD7]">Botones e Items de Menú:</strong> Reaccionan con animación de escala (<code className="text-[#E6BF76] font-mono text-[10px]">scale-[1.03]</code>), cambio suave de borde a un tono dorado vibrante y destellos de opacidad dorada al pasar el cursor.
                              </li>
                              <li>
                                <strong className="text-[#F4EAD7]">Botón del Carrito:</strong> Reacciona dinámicamente convirtiendo su icono de dorado a crema claro con fondo cobalto satinado.
                              </li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        onClick={handleSaveSettings}
                        disabled={saving}
                        className="py-2.5 px-6 bg-blue-600 text-white rounded-lg font-semibold text-xs transition-all hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Save className="h-4 w-4" />
                        <span>{saving ? "Guardando..." : "Guardar Personalización"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. CHOOSE CAT LIST FOR PRODUCTS EDITOR */}
                {adminSection === "products" && !isNewProductMode && !editingProduct && (
                  <div className="space-y-4">
                    
                    {/* Catalog management header & metrics */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center">
                        <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase">Total Productos</span>
                        <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">{store.products.length}</p>
                      </div>
                      <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center">
                        <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase">Sin Stock</span>
                        <p className="text-xl font-bold font-mono text-red-500 mt-1">
                          {store.products.filter(p => p.stock <= 0).length}
                        </p>
                      </div>
                      <div className="bg-white dark:bg-zinc-950 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm text-center">
                        <span className="text-[10px] font-extrabold text-zinc-500 dark:text-zinc-400 uppercase">Destacados</span>
                        <p className="text-xl font-bold font-mono text-yellow-500 mt-1">
                          {store.products.filter(p => p.featured).length}
                        </p>
                      </div>
                    </div>

                    {/* Products Grid list detail for editor quick action */}
                    <div className="bg-white dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Listado de Artículos</h4>
                        <span className="text-[10px] font-mono text-zinc-400">Total: {store.products.length} productos</span>
                      </div>

                      {/* Search Bar & Advanced Filters for Admin Catalog */}
                      <div className="p-4 bg-slate-50 dark:bg-zinc-900/40 border-b border-slate-100 dark:border-zinc-800 space-y-3">
                        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                          <div className="relative w-full md:max-w-md">
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                              <Search className="h-4 w-4 text-slate-400" />
                            </span>
                            <input
                              type="text"
                              value={adminProductSearchQuery}
                              onChange={(e) => setNewProductErrors({}) || setAdminProductSearchQuery(e.target.value)}
                              placeholder="Buscar por nombre, código base, descripción o SKU de variante..."
                              className="block w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-slate-900 dark:text-zinc-100 placeholder-slate-450 focus:outline-none focus:ring-1 focus:ring-[#5346ff]"
                            />
                            {adminProductSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setAdminProductSearchQuery("")}
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-zinc-650 cursor-pointer"
                              >
                                <span className="text-[10px]">✕ Llimpiar</span>
                              </button>
                            )}
                          </div>

                          <div className="text-[10px] text-zinc-400 font-semibold font-mono self-end">
                            Mostrando: <span className="text-white bg-zinc-805 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{filteredAdminProducts.length}</span> de {store.products.length} productos
                          </div>
                        </div>

                        {/* Dropdown Filters Row */}
                        <div className="flex flex-wrap gap-2.5 items-center">
                          <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest shrink-0">Filtrar por:</span>
                          
                          {/* Category Filter */}
                          <select
                            value={adminProductCategoryFilter}
                            onChange={(e) => setAdminProductCategoryFilter(e.target.value)}
                            className="bg-white dark:bg-zinc-950 text-[11px] font-semibold border border-slate-250 dark:border-zinc-800 rounded px-2.5 py-1 text-slate-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-[#5346ff]"
                          >
                            <option value="all">Todas las Categorías</option>
                            {(store.dbCategories || []).map(c => (
                              <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                          </select>

                          {/* Stock Status Filter */}
                          <select
                            value={adminProductStockFilter}
                            onChange={(e) => setAdminProductStockFilter(e.target.value)}
                            className="bg-white dark:bg-zinc-950 text-[11px] font-semibold border border-slate-250 dark:border-zinc-800 rounded px-2.5 py-1 text-slate-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-[#5346ff]"
                          >
                            <option value="all">Stock: Todos</option>
                            <option value="instock">Con Stock disponible</option>
                            <option value="outofstock">Sin Stock (Agotados)</option>
                          </select>

                          {/* Publication Status Filter */}
                          <select
                            value={adminProductStatusFilter}
                            onChange={(e) => setAdminProductStatusFilter(e.target.value)}
                            className="bg-white dark:bg-zinc-950 text-[11px] font-semibold border border-slate-250 dark:border-zinc-800 rounded px-2.5 py-1 text-slate-700 dark:text-zinc-300 outline-none focus:ring-1 focus:ring-[#5346ff]"
                          >
                            <option value="all">Estado: Todos</option>
                            <option value="active">Activos / Visibles</option>
                            <option value="paused">Pausados / Ocultos</option>
                          </select>

                          {/* Reset filters button if any filter active */}
                          {(adminProductCategoryFilter !== "all" || adminProductStockFilter !== "all" || adminProductStatusFilter !== "all" || adminProductSearchQuery) && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdminProductCategoryFilter("all");
                                setAdminProductStockFilter("all");
                                setAdminProductStatusFilter("all");
                                setAdminProductSearchQuery("");
                              }}
                              className="text-[10px] text-red-500 font-bold hover:underline py-1 px-2 hover:bg-red-550/5 rounded transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>✕ Limpiar todos los filtros</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {filteredAdminProducts.length === 0 ? (
                          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            No se encontraron artículos que coincidan con la búsqueda.
                          </div>
                        ) : (
                          filteredAdminProducts.map((p) => (
                          <div key={p.id} className="p-4 flex gap-4 items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-900/40 transition">
                            <img
                              src={p.imageUrl || "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"}
                              alt={p.name}
                              className="h-10 w-10 rounded-lg object-cover bg-zinc-800"
                            />
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {p.codigo && (
                                  <span className="bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 rounded text-[9px] font-black uppercase px-2 py-0.5 tracking-wider font-mono">
                                    {p.codigo}
                                  </span>
                                )}
                                <h5 className="font-semibold text-xs truncate text-slate-900 dark:text-zinc-200">{p.name}</h5>
                                {p.paused && (
                                  <span className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded text-[9px] font-extrabold uppercase px-1.5 py-0.5 tracking-wider font-mono">
                                    Pausado
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-zinc-400">
                                <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{p.category}</span>
                                {p.categorias_adicionales && p.categorias_adicionales.map(catId => {
                                  const name = (store.dbCategories || []).find(c => c.id === catId)?.nombre;
                                  if (!name) return null;
                                  return (
                                    <span key={catId} className="bg-[#5346ff]/10 text-[#5346ff] border border-[#5346ff]/20 px-1.5 py-0.5 rounded">
                                      + {name}
                                    </span>
                                  );
                                })}
                                {p.subcategorias_adicionales && p.subcategorias_adicionales.map(subId => {
                                  const name = (store.dbSubcategories || []).find(s => s.id === subId)?.nombre;
                                  if (!name) return null;
                                  return (
                                    <span key={subId} className="bg-teal-550/10 text-teal-605 border border-teal-500/25 px-1.5 py-0.5 rounded dark:bg-teal-500/10 dark:text-teal-400 dark:border-teal-500/25">
                                      + {name}
                                    </span>
                                  );
                                })}
                                <span>PVP: <strong>${p.price.toFixed(2)}</strong></span>
                                <span>Stock: <strong className={p.stock === 0 ? "text-red-400" : "text-emerald-400"}>{p.stock} u</strong></span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTogglePause(p.id)}
                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                  p.paused 
                                    ? "bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500" 
                                    : "bg-zinc-800/80 hover:bg-zinc-700 hover:text-white text-zinc-400"
                                }`}
                                title={p.paused ? "Reanudar (Mostrar en la web)" : "Pausar (Ocultar en la web)"}
                              >
                                {p.paused ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingProduct(prepareProductForEditing(p));
                                  setEditingProductStep(1);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 hover:text-white text-zinc-300 transition cursor-pointer"
                                title="Editar"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        )))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. NEW PRODUCT FORM DISPLAY */}
                {adminSection === "products" && isNewProductMode && (
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                        e.preventDefault();
                      }
                    }}
                    className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-emerald-400" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Nuevo Artículo (Paso a Paso)</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsNewProductMode(false) || setNewProductStep(1)}
                        className="text-xs text-zinc-400 hover:text-white underline"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Form Step-by-Step progress tabs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 p-1 rounded-xl gap-1">
                      {[
                        { step: 1, label: "Info Básica", icon: "📋" },
                        { step: 2, label: "Precios y Fotos", icon: "💰" },
                        { step: 3, label: "Variantes", icon: "✨" },
                        { step: 4, label: "Inventario y Envío", icon: "⚙️" }
                      ].map((s) => (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => {
                            // Validate previous steps lightly
                            if (s.step > 1 && (!newProduct.name || !newProduct.name.trim())) {
                              setNewProductErrors({ name: "El nombre es obligatorio antes de avanzar." });
                              setNewProductStep(1);
                              return;
                            }
                            if (s.step > 1 && !newProduct.categoria_id) {
                              setNewProductErrors({ category: "La categoría es obligatoria." });
                              setNewProductStep(1);
                              return;
                            }
                            setNewProductStep(s.step);
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-[11px] font-bold transition duration-200 cursor-pointer ${
                            newProductStep === s.step
                              ? "bg-blue-600 text-white shadow-sm"
                              : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850"
                          }`}
                        >
                          <span className="font-mono text-xs">{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Global Form Validation Info Banner */}
                    {Object.keys(newProductErrors).length > 0 && (
                      <div className="p-3 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                        <span>Corrige los avisos antes de avanzar: {Object.values(newProductErrors).join(" | ")}</span>
                      </div>
                    )}

                    {newProductStep === 1 && (
                      <div className="space-y-4 animate-fade-in unique-step-one">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                          <span>Nombre del Producto *</span>
                          {newProductErrors.name && <span className="text-red-500 text-[9px] font-semibold lowercase">obligatorio</span>}
                        </label>
                        <input
                          type="text"
                          value={newProduct.name || ""}
                          onChange={(e) => {
                            setNewProduct({ ...newProduct, name: e.target.value });
                            if (newProductErrors.name) {
                              setNewProductErrors(prev => {
                                const copy = { ...prev };
                                delete copy.name;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white transition-all ${
                            newProductErrors.name 
                              ? "border-red-500 dark:border-red-650 ring-1 ring-red-500/30" 
                              : "border-slate-200 dark:border-zinc-800"
                          }`}
                          placeholder="p.ej. Auriculares inalámbricos HiFi"
                        />
                        {newProductErrors.name && (
                          <p className="text-[10px] text-red-505 dark:text-red-400 mt-1 font-semibold flex items-center gap-1">
                            <span>⚠</span> {newProductErrors.name}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                          <span>Categoría Principal *</span>
                          {newProductErrors.category && <span className="text-red-500 text-[9px] font-semibold lowercase">obligatoria</span>}
                        </label>
                        <select
                          value={newProduct.categoria_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const match = (store.dbCategories || []).find(c => c.id === val);
                            const isCategory3D = !!match && (
                              match.nombre.toLowerCase().includes("3d") ||
                              match.nombre.toLowerCase().includes("impresión") ||
                              match.nombre.toLowerCase().includes("impresion") ||
                              match.nombre.toLowerCase().includes("impreción") ||
                              match.nombre.toLowerCase().includes("imprecion")
                            );
                            const currentSizes = newProduct.sizes || [];
                            const needsDefaultMaterials = isCategory3D && (currentSizes.length === 0 || currentSizes.includes("S") || currentSizes.includes("M") || currentSizes.includes("L") || currentSizes.includes("Único"));
                            setNewProduct({
                              ...newProduct,
                              categoria_id: val,
                              category: match ? match.nombre : "",
                              subcategoria_id: "all", // reset subcategory on parent change
                              is3D: isCategory3D ? true : newProduct.is3D,
                              hoursPerUnit: isCategory3D ? (newProduct.hoursPerUnit || 1) : newProduct.hoursPerUnit,
                              sizes: needsDefaultMaterials ? ["PLA", "PETG", "ABS", "TPU"] : currentSizes
                            });
                            if (newProductErrors.category) {
                              setNewProductErrors(prev => {
                                const copy = { ...prev };
                                delete copy.category;
                                return copy;
                              });
                            }
                          }}
                          className={`w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border rounded-lg text-xs outline-none text-slate-900 dark:text-white transition-all ${
                            newProductErrors.category
                              ? "border-red-500 dark:border-red-650 ring-1 ring-red-500/30"
                              : "border-slate-200 dark:border-zinc-800"
                          }`}
                        >
                          <option value="">-- Elige categoría --</option>
                          {(store.dbCategories || [])
                            .sort((a, b) => (a.orden || 0)  - (b.orden || 0))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre} {c.active === false ? " (Inactiva)" : ""}
                              </option>
                            ))}
                        </select>
                        {newProductErrors.category && (
                          <p className="text-[10px] text-red-505 dark:text-red-400 mt-1 font-semibold flex items-center gap-1">
                            <span>⚠</span> {newProductErrors.category}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                          <span>Subcategoría Relacionada</span>
                        </label>
                        <select
                          value={newProduct.subcategoria_id || "all"}
                          onChange={(e) => setNewProduct({ ...newProduct, subcategoria_id: e.target.value })}
                          disabled={!newProduct.categoria_id}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-all font-semibold"
                        >
                          <option value="all">Sin subcategoría / General</option>
                          {(store.dbSubcategories || [])
                            .filter(s => s.categoria_id === newProduct.categoria_id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre} {s.active === false ? " (Inactiva)" : ""}
                              </option>
                            ))}
                        </select>
                        {!newProduct.categoria_id && (
                          <p className="text-[9px] text-zinc-500 mt-1">Selecciona primero una categoría principal.</p>
                        )}
                      </div>
                    </div>

                    {/* Categorías y Subcategorías Adicionales / Secundarias para Nuevo Producto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Categorías secundarias adicionales para Nuevo Producto */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex flex-col">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                          Categorías Adicionales / Secundarias <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">(elige del menú desplegable)</span>
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const list = newProduct.categorias_adicionales || [];
                              if (!list.includes(val)) {
                                setNewProduct({
                                  ...newProduct,
                                  categorias_adicionales: [...list, val]
                                });
                              }
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white transition-all font-semibold cursor-pointer"
                        >
                          <option value="">-- Seleccionar categoría adicional --</option>
                          {(store.dbCategories || [])
                            .sort((a,b) => (a.orden || 0) - (b.orden || 0))
                            .filter(c => c.id !== newProduct.categoria_id && !(newProduct.categorias_adicionales && newProduct.categorias_adicionales.includes(c.id)))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {(newProduct.categorias_adicionales || []).map((catId) => {
                            const cat = (store.dbCategories || []).find(c => c.id === catId);
                            if (!cat) return null;
                            return (
                              <span
                                key={catId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#5346ff]/10 text-[#5346ff] dark:bg-[#5346ff]/20 dark:text-[#9086ff] border border-[#5346ff]/30 rounded-lg text-xs font-semibold"
                              >
                                <span>{cat.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewProduct({
                                      ...newProduct,
                                      categorias_adicionales: (newProduct.categorias_adicionales || []).filter(id => id !== catId)
                                    });
                                  }}
                                  className="text-sm font-bold hover:text-red-500 transition-colors ml-1 focus:outline-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                          {(newProduct.categorias_adicionales || []).length === 0 && (
                            <span className="text-[10px] text-zinc-400 italic">No hay categorías adicionales seleccionadas.</span>
                          )}
                        </div>
                      </div>

                      {/* Subcategorías secundarias adicionales para Nuevo Producto */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex flex-col">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                          Subcategorías Adicionales / Secundarias <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">(elige categoría principal primero)</span>
                        </label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          <div>
                            <select
                              value={newSubSecCategoryFilter}
                              onChange={(e) => setNewSubSecCategoryFilter(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white transition-all font-semibold cursor-pointer"
                            >
                              <option value="">-- Categoría de Filtro --</option>
                              {(store.dbCategories || [])
                                .sort((a,b) => (a.orden || 0) - (b.orden || 0))
                                .map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <select
                              value=""
                              disabled={!newSubSecCategoryFilter}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const list = newProduct.subcategorias_adicionales || [];
                                  if (!list.includes(val)) {
                                    setNewProduct({
                                      ...newProduct,
                                      subcategorias_adicionales: [...list, val]
                                    });
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-all font-semibold cursor-pointer"
                            >
                              <option value="">-- Elige Subcategoría --</option>
                              {(store.dbSubcategories || [])
                                .filter(s => s.categoria_id === newSubSecCategoryFilter && s.id !== newProduct.subcategoria_id && !(newProduct.subcategorias_adicionales && newProduct.subcategorias_adicionales.includes(s.id)))
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.nombre}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {(newProduct.subcategorias_adicionales || []).map((subId) => {
                            const sub = (store.dbSubcategories || []).find(s => s.id === subId);
                            if (!sub) return null;
                            const cat = (store.dbCategories || []).find(c => c.id === sub.categoria_id);
                            return (
                              <span
                                key={subId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#5346ff]/10 text-[#5346ff] dark:bg-[#5346ff]/20 dark:text-[#9086ff] border border-[#5346ff]/30 rounded-lg text-xs font-semibold"
                              >
                                <span className="text-[10px] opacity-75 mr-1 font-mono uppercase">
                                  {cat ? cat.nombre : ""}
                                </span>
                                <span>{sub.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewProduct({
                                      ...newProduct,
                                      subcategorias_adicionales: (newProduct.subcategorias_adicionales || []).filter(id => id !== subId)
                                    });
                                  }}
                                  className="text-sm font-bold hover:text-red-500 transition-colors ml-1 focus:outline-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                          {(newProduct.subcategorias_adicionales || []).length === 0 && (
                            <span className="text-[10px] text-zinc-400 italic">No hay subcategorías adicionales seleccionadas.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {newProductStep === 1 && (
                      <div className="space-y-2 uniq-desc">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Descripción Detallada</label>
                        <textarea
                          value={newProduct.description}
                          onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white resize-none"
                          placeholder="Escribe detalles del producto..."
                        />
                      </div>
                    )}

                    {newProductStep === 2 && (
                      <div className="space-y-6 animate-fade-in unique-step-two">
                        
                        {/* Finanzas y Precios */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 space-y-4">
                          <h4 className="text-xs font-black text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                            <span>💵</span> Finanzas, Costos y Precios
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Precio Compra ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newProduct.precioCompra || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setNewProduct(updateProductCalculations({ ...newProduct, precioCompra: val }));
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Costo de compra"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span>Precio con 40%</span>
                                <span className="text-[8px] bg-slate-100 dark:bg-zinc-800 px-1 py-0.2 rounded font-normal lowercase text-slate-500">auto</span>
                              </label>
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={newProduct.precioCon40 || ""}
                                className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-850 rounded-lg text-xs text-slate-500 font-mono font-bold cursor-not-allowed select-none"
                                placeholder="Precio Compra + 40%"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Descuento (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={newProduct.descuentoPorcentaje || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Math.min(99, Math.max(0, Number(e.target.value)));
                                  setNewProduct(updateProductCalculations({ ...newProduct, descuentoPorcentaje: val }));
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-indigo-600 dark:text-indigo-400 font-mono font-bold"
                                placeholder="Ej. 15%"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Comisión ML ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newProduct.comisionML || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setNewProduct(updateProductCalculations({ ...newProduct, comisionML: val }));
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Comisión de MercadoLibre"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Precio Venta ML ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={newProduct.precioVentaML || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setNewProduct(updateProductCalculations({ ...newProduct, precioVentaML: val }));
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Precio en MercadoLibre"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-[#5346ff] dark:text-[#9086ff] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span>Precio Web ($)</span>
                                <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.2 rounded font-normal lowercase text-indigo-500">auto</span>
                              </label>
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={newProduct.precioWeb || ""}
                                className="w-full px-3 py-2 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-xs text-indigo-600 dark:text-indigo-400 font-mono font-black cursor-not-allowed select-none"
                                placeholder="Calculado: ML - Comisión"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Distribución de Stock */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 space-y-4">
                          <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                            <span>📦</span> Almacenes y Stock por Sucursal
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Stock Pinamar</label>
                              <input
                                type="number"
                                min="0"
                                value={newProduct.stockPinamar || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setNewProduct(updateProductCalculations({ ...newProduct, stockPinamar: val }));
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Unidades en Pinamar"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Stock Montevideo</label>
                              <input
                                type="number"
                                min="0"
                                value={newProduct.stockMontevideo || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setNewProduct(updateProductCalculations({ ...newProduct, stockMontevideo: val }));
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Unidades en Montevideo"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span>Stock Total Actual</span>
                                <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.2 rounded font-normal lowercase text-emerald-500">auto</span>
                              </label>
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={newProduct.stockTotalActual || ""}
                                className="w-full px-3 py-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-mono font-extrabold cursor-not-allowed select-none"
                                placeholder="Calculado: Suma stock"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Galería de imágenes */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 space-y-4">
                          <h4 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🖼</span> Galería de Fotos del Artículo
                          </h4>
                          <ImageGalleryEditor
                            images={[newProduct.imageUrl || "", ...(newProduct.imagenes || [])].filter(Boolean)}
                            onChange={(updatedImages) => {
                              setNewProduct({
                                ...newProduct,
                                imageUrl: updatedImages[0] || "",
                                imagenes: updatedImages.slice(1)
                              });
                            }}
                            isThemeDark={store.settings.themeMode === "dark"}
                          />
                        </div>
                      </div>
                    )}

                    {newProductStep === 3 && (
                      <div className="space-y-4 animate-fade-in unique-step-three">
                        {/* Talles y Colores Configuration Panel */}
                        <div className="flex flex-col gap-6 border border-indigo-500/10 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40">
                      <div>
                        {newProduct.is3D || is3DProduct(newProduct as Product) ? (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                              Materiales 3D Disponibles
                            </label>
                            <input
                              type="text"
                              value={(newProduct.sizes || []).join(", ")}
                              onChange={(e) => {
                                const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                setNewProduct({ ...newProduct, sizes: arr });
                              }}
                              placeholder="p.ej. PLA, PETG, ABS, TPU (Separados por comas)"
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white mb-2"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[9px] text-zinc-500 mr-1 self-center">Preajustes rápidos:</span>
                              {["PLA", "PETG", "ABS", "TPU"].map((mat) => {
                                const isSelected = (newProduct.sizes || []).includes(mat);
                                return (
                                  <button
                                    type="button"
                                    key={mat}
                                    onClick={() => {
                                      const current = newProduct.sizes || [];
                                      const next = current.includes(mat)
                                        ? current.filter(x => x !== mat)
                                        : [...current, mat];
                                      setNewProduct({ ...newProduct, sizes: next });
                                    }}
                                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${
                                      isSelected 
                                        ? "bg-indigo-600 text-white font-bold" 
                                        : "bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    {mat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (newProduct.categoria_id === "ropa" || (newProduct.category || "").toLowerCase().includes("ropa") || (newProduct.category || "").toLowerCase().includes("indumentaria")) ? (
                          <div className="space-y-3 p-3 bg-white/50 dark:bg-zinc-950/40 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-extrabold text-[#5346ff] dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Ruler className="w-3.5 h-3.5" />
                                <span>Guía de Tallas (Ropa)</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  (newProduct.sizeChartEnabled !== false)
                                    ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                                }`}>
                                  {(newProduct.sizeChartEnabled !== false) ? "Activado" : "Desactivado"}
                                </span>
                                <input 
                                  type="checkbox"
                                  checked={newProduct.sizeChartEnabled !== false}
                                  onChange={(e) => {
                                    setNewProduct({ ...newProduct, sizeChartEnabled: e.target.checked });
                                  }}
                                  className="h-4 w-4 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                />
                              </div>
                            </div>
                            
                            {(newProduct.sizeChartEnabled !== false) ? (
                              <div className="space-y-4">
                                {/* Dynamic Tabs Visibility Control */}
                                <div className="p-3 bg-indigo-50/40 dark:bg-zinc-900/40 rounded-xl border border-indigo-500/10 space-y-2 mb-2">
                                  <p className="text-[10px] font-bold text-[#5346ff] dark:text-indigo-400 uppercase tracking-wider">
                                    Pestañas visibles en la guía de tallas:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={newProduct.sizeChartShowSuperior !== false}
                                        onChange={(e) => setNewProduct({ ...newProduct, sizeChartShowSuperior: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">👕 Superiores</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={newProduct.sizeChartShowInferior !== false}
                                        onChange={(e) => setNewProduct({ ...newProduct, sizeChartShowInferior: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">👖 Inferiores</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={newProduct.sizeChartShowCalzado !== false}
                                        onChange={(e) => setNewProduct({ ...newProduct, sizeChartShowCalzado: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">👟 Calzado</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={newProduct.sizeChartShowRecommender !== false}
                                        onChange={(e) => setNewProduct({ ...newProduct, sizeChartShowRecommender: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">📏 Calculador</span>
                                    </label>
                                  </div>
                                </div>

                                <p className="text-[10px] text-slate-800 dark:text-zinc-300 leading-normal mb-1">
                                  <strong>1. Selecciona los talles activos:</strong> Selecciona de los preajustes o añade talles personalizados.
                                </p>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {(() => {
                                    const currentSizes = newProduct.sizes || [];
                                    const fallbackStandard = ["S", "M", "L", "XL", "XXL", "Único"];
                                    const allSizes = Array.from(new Set([...fallbackStandard, ...currentSizes]));
                                    
                                    return allSizes.map((sz) => {
                                      const isActive = currentSizes.includes(sz);
                                      return (
                                        <div 
                                          key={sz}
                                          className={`p-1.5 rounded-lg border transition-all flex items-center justify-between gap-1 ${
                                            isActive 
                                              ? "bg-white dark:bg-zinc-900 border-[#5346ff]/35 shadow-xs text-[#5346ff] dark:text-indigo-400 font-bold animate-fade-in" 
                                              : "bg-slate-100/50 dark:bg-zinc-950/20 border-transparent text-zinc-400 opacity-60"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 flex-grow min-w-0">
                                            <input 
                                              type="checkbox"
                                              checked={isActive}
                                              onChange={() => {
                                                const next = isActive 
                                                  ? currentSizes.filter(x => x !== sz)
                                                  : [...currentSizes, sz];
                                                setNewProduct({ ...newProduct, sizes: next });
                                              }}
                                              className="h-3 w-3 rounded border-slate-300 dark:border-zinc-700 text-[#5346ff] focus:ring-[#5346ff] cursor-pointer"
                                            />
                                            <span className="text-xs truncate">{sz}</span>
                                          </div>
                                          {!fallbackStandard.includes(sz) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = currentSizes.filter(x => x !== sz);
                                                setNewProduct({ ...newProduct, sizes: next });
                                              }}
                                              className="text-red-500 hover:text-red-700 text-xs font-bold px-1 cursor-pointer"
                                              title="Eliminar talle"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                                <div className="flex gap-1 items-center">
                                  <input 
                                    type="text"
                                    id="add-new-custom-size-input-new"
                                    placeholder="Ej: 38, XS, Especial"
                                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs outline-none text-slate-900 dark:text-white"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const val = e.currentTarget.value.trim();
                                        if (val) {
                                          const current = newProduct.sizes || [];
                                          if (!current.includes(val)) {
                                            setNewProduct({ ...newProduct, sizes: [...current, val] });
                                          }
                                          e.currentTarget.value = "";
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById("add-new-custom-size-input-new") as HTMLInputElement;
                                      const val = input?.value?.trim();
                                      if (val) {
                                        const current = newProduct.sizes || [];
                                        if (!current.includes(val)) {
                                          setNewProduct({ ...newProduct, sizes: [...current, val] });
                                        }
                                        if (input) input.value = "";
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-[#5346ff] text-white hover:bg-[#4336ee] rounded-md text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                  >
                                    + Agregar talle
                                  </button>
                                </div>

                                <hr className="border-slate-200 dark:border-zinc-800" />

                                <p className="text-[10px] text-slate-800 dark:text-zinc-300 leading-normal">
                                  <strong>2. Completa las medidas de la tabla:</strong> Agrega columnas editables (Ej: Ancho, Largo, Cadera, Manga) y pon la medida de cada talle.
                                </p>

                                {(() => {
                                  const sizesList = newProduct.sizes || [];
                                  if (sizesList.length === 0) {
                                    return (
                                      <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 p-2.5 rounded-lg font-medium text-center">
                                        Selecciona al menos un talle arriba para rellenar las medidas de la tabla.
                                      </p>
                                    );
                                  }

                                  const chartObj = getProductSizeChartData(newProduct);
                                  const cols = chartObj.columns;
                                  const mRows = chartObj.rows;

                                  return (
                                    <div className="space-y-2">
                                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800 max-w-full">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                          <thead>
                                            <tr className="bg-slate-100/90 dark:bg-zinc-900/60 text-slate-800 dark:text-zinc-200">
                                              {cols.map((colName, colIdx) => (
                                                <th key={colName} className="p-1.5 border-r border-slate-200 dark:border-zinc-800 font-bold whitespace-nowrap">
                                                  <div className="flex items-center justify-between gap-1 min-w-[70px]">
                                                    <span>{colName}</span>
                                                    {colIdx > 0 && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const nextCols = cols.filter(c => c !== colName);
                                                          const nextRows = mRows.map(r => {
                                                            const copy = { ...r };
                                                            delete copy[colName];
                                                            return copy;
                                                          });
                                                          setNewProduct({
                                                            ...newProduct,
                                                            sizeChartData: { columns: nextCols, rows: nextRows }
                                                          });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 text-xs font-bold px-0.5"
                                                        title="Eliminar columna"
                                                      >
                                                        ×
                                                      </button>
                                                    )}
                                                  </div>
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {mRows.map((rowObj) => {
                                              const sizeVal = rowObj["Talle"];
                                              return (
                                                <tr key={sizeVal} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50">
                                                  {cols.map((colName) => {
                                                    if (colName === "Talle") {
                                                      return (
                                                        <td key={colName} className="p-1.5 font-bold text-[#5346ff] border-r border-slate-200 dark:border-zinc-800 bg-slate-50/55 dark:bg-zinc-900/20">
                                                          {sizeVal}
                                                        </td>
                                                      );
                                                    }

                                                    const cellVal = rowObj[colName] || "";
                                                    return (
                                                      <td key={colName} className="p-1 border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20">
                                                        <input
                                                          type="text"
                                                          value={cellVal}
                                                          onChange={(e) => {
                                                            const updatedRows = mRows.map(r => {
                                                              if (r["Talle"] === sizeVal) {
                                                                return { ...r, [colName]: e.target.value };
                                                              }
                                                              return r;
                                                            });
                                                            setNewProduct({
                                                              ...newProduct,
                                                              sizeChartData: { columns: cols, rows: updatedRows }
                                                            });
                                                          }}
                                                          placeholder="ej: 50 cm"
                                                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded px-1.5 py-0.5 text-[11px] outline-none text-slate-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="flex gap-1.5 items-center justify-end pt-1">
                                        <input 
                                          type="text"
                                          id="add-new-column-input-new"
                                          placeholder="Ej: Ancho (cm), Manga"
                                          className="px-2 py-0.5 max-w-[170px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-[10px] outline-none"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              const val = e.currentTarget.value.trim();
                                              if (val && !cols.includes(val)) {
                                                setNewProduct({
                                                  ...newProduct,
                                                  sizeChartData: {
                                                    columns: [...cols, val],
                                                    rows: mRows.map(r => ({ ...r, [val]: "" }))
                                                  }
                                                });
                                                e.currentTarget.value = "";
                                              }
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.getElementById("add-new-column-input-new") as HTMLInputElement;
                                            const val = input?.value?.trim();
                                            if (val && !cols.includes(val)) {
                                              setNewProduct({
                                                ...newProduct,
                                                sizeChartData: {
                                                  columns: [...cols, val],
                                                  rows: mRows.map(r => ({ ...r, [val]: "" }))
                                                }
                                              });
                                              if (input) input.value = "";
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 hover:dark:bg-zinc-700 text-zinc-755 dark:text-zinc-200 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                        >
                                          + Agregar medida
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="p-3 text-center bg-slate-100 dark:bg-zinc-950/20 text-zinc-500 rounded-xl border border-slate-200 dark:border-zinc-800">
                                <p className="text-[11px] font-medium">Guía de tallas desactivada para este producto.</p>
                                <p className="text-[9.5px] text-zinc-400 mt-1">El botón de "Guía de talles" no estará visible en la página de detalles para este producto.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Talles / Tamaños Disponibles</label>
                            <input
                              type="text"
                              value={(newProduct.sizes || []).join(", ")}
                              onChange={(e) => {
                                const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                setNewProduct({ ...newProduct, sizes: arr });
                              }}
                              placeholder="p.ej. S, M, L, XL (Separados por comas)"
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white mb-2"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[9px] text-zinc-500 mr-1 self-center">Preajustes rápidos:</span>
                              {["S", "M", "L", "XL", "XXL", "Único"].map((sz) => {
                                const isSelected = (newProduct.sizes || []).includes(sz);
                                return (
                                  <button
                                    type="button"
                                    key={sz}
                                    onClick={() => {
                                      const current = newProduct.sizes || [];
                                      const next = current.includes(sz)
                                        ? current.filter(x => x !== sz)
                                        : [...current, sz];
                                      setNewProduct({ ...newProduct, sizes: next });
                                    }}
                                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${
                                      isSelected 
                                        ? "bg-indigo-600 text-white font-bold" 
                                        : "bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Colores Disponibles</label>
                        <input
                          type="text"
                          value={(newProduct.colors || []).join(", ")}
                          onChange={(e) => {
                            const arr = e.target.value.split(",").map(c => c.trim()).filter(Boolean);
                            setNewProduct({ ...newProduct, colors: arr });
                          }}
                          placeholder="p.ej. Negro, Blanco, Gris, Rojo (Separados por comas)"
                          className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white mb-2"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[9px] text-zinc-500 mr-1 self-center">Preajustes rápidos:</span>
                          {["Negro", "Blanco", "Gris", "Azul", "Rojo", "Verde", "Beige", "Rosa"].map((col) => {
                            const isSelected = (newProduct.colors || []).includes(col);
                            return (
                              <button
                                type="button"
                                key={col}
                                onClick={() => {
                                  const current = newProduct.colors || [];
                                  const next = current.includes(col)
                                    ? current.filter(x => x !== col)
                                    : [...current, col];
                                  setNewProduct({ ...newProduct, colors: next });
                                }}
                                className={`text-[9.5px] px-2 py-0.5 rounded cursor-pointer transition-all ${
                                  isSelected 
                                    ? "bg-indigo-600 text-white font-bold" 
                                    : "bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {col}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* PRODUCT COMBINATIONS VARIANT STOCK MANAGER */}
                    <div className="border border-indigo-500/10 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                            Gestor de Stock de Variantes (Combinación Exacto)
                          </label>
                          <p className="text-[9px] text-zinc-400 mt-0.5">Asigna inventarios individuales por talle, color y sucursal, y un precio diferente por variante si lo requiere</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const curSizes = newProduct.sizes || [];
                            const curColors = newProduct.colors || [];
                            if (curSizes.length === 0 && curColors.length === 0) {
                              showAdminToast("Primero ingresa talles o colores arriba para generar combinaciones.", "error");
                              return;
                            }
                            
                            const generated: ProductVariant[] = [];
                            const sizesList = curSizes.length > 0 ? curSizes : ["Único"];
                            const colorsList = curColors.length > 0 ? curColors : ["General"];
                            
                            let isFirst = (newProduct.variants || []).length === 0;
                            const currentSkus = (newProduct.variants || []).map(v => v.sku).filter(Boolean) as string[];

                            for (const sz of sizesList) {
                              for (const col of colorsList) {
                                const exists = (newProduct.variants || []).some(v => v.size === sz && v.color === col);
                                if (!exists) {
                                  const nextNum = getNextAvailableSKUNumber(store.products, currentSkus);
                                  const generatedSku = `J${String(nextNum).padStart(3, '0')}`;
                                  currentSkus.push(generatedSku);
                                  const sp = Math.floor(Number(newProduct.stockPinamar !== undefined ? newProduct.stockPinamar : 5));
                                  const sm = Math.floor(Number(newProduct.stockMontevideo !== undefined ? newProduct.stockMontevideo : 0));
                                  generated.push({
                                    size: sz,
                                    color: col,
                                    colorCode: col === "Negro" ? "#000000" : col === "Blanco" ? "#ffffff" : col === "Rojo" ? "#ef4444" : col === "Azul" ? "#3b82f6" : col === "Verde" ? "#22c55e" : col === "Gris" ? "#6b7280" : col === "Beige" ? "#f5f5dc" : col === "Rosa" ? "#f472b6" : "#9ca3af",
                                    sku: generatedSku,
                                    stockPinamar: sp,
                                    stockMontevideo: sm,
                                    stock: sp + sm,
                                    priceDelta: 0
                                  });
                                }
                              }
                            }
                            
                            const combined = [...(newProduct.variants || []), ...generated];
                            setNewProduct(updateProductCalculations({
                              ...newProduct,
                              variants: combined
                            }));
                            showAdminToast(`Se autogeneraron ${generated.length} combinaciones con códigos sugeridos.`, "success");
                          }}
                          className="text-[9px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition-all cursor-pointer self-start sm:self-center"
                        >
                          Generar Todas las Combinaciones
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-100/30 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-200 dark:border-zinc-800">
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Talle</label>
                          <select
                            id="new-var-size"
                            value={newVarSize}
                            onChange={(e) => setNewVarSize(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            {((newProduct.sizes || []).length > 0 ? (newProduct.sizes || []) : ["Único"]).map(sz => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Color</label>
                          <select
                            id="new-var-color"
                            value={newVarColor}
                            onChange={(e) => setNewVarColor(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            {((newProduct.colors || []).length > 0 ? (newProduct.colors || []) : ["General"]).map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Código / SKU Variant (Sistema)</label>
                          <input
                            id="new-var-sku"
                            type="text"
                            readOnly
                            value={(() => {
                              const currentNewSkus = (newProduct.variants || []).map(v => v.sku).filter(Boolean) as string[];
                              const nextNewNum = getNextAvailableSKUNumber(store.products, currentNewSkus);
                              return `J${String(nextNewNum).padStart(3, '0')}`;
                            })()}
                            className="w-full text-xs bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-1 rounded font-semibold font-mono text-zinc-500 dark:text-zinc-400 uppercase cursor-not-allowed opacity-75"
                            placeholder="Autogenerado"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Stock Pinamar</label>
                          <input id="new-var-stock-pinamar" type="number" defaultValue="5" className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-mono font-bold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Stock Montevideo</label>
                          <input id="new-var-stock-montevideo" type="number" defaultValue="0" className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-mono font-bold" />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              const szEl = document.getElementById('new-var-size') as HTMLSelectElement;
                              const colEl = document.getElementById('new-var-color') as HTMLSelectElement;
                              const stkPinEl = document.getElementById('new-var-stock-pinamar') as HTMLInputElement;
                              const stkMonEl = document.getElementById('new-var-stock-montevideo') as HTMLInputElement;
                              
                              if (szEl && colEl && stkPinEl && stkMonEl) {
                                const sz = szEl.value;
                                const col = colEl.value;
                                const currentNewSkus = (newProduct.variants || []).map(v => v.sku).filter(Boolean) as string[];
                                const nextNewNum = getNextAvailableSKUNumber(store.products, currentNewSkus);
                                const sku = `J${String(nextNewNum).padStart(3, '0')}`;
                                const stkPin = Math.max(0, Math.floor(Number(stkPinEl.value || 0)));
                                const stkMon = Math.max(0, Math.floor(Number(stkMonEl.value || 0)));
                                
                                const current = newProduct.variants || [];
                                if (current.some(v => v.size === sz && v.color === col)) {
                                  showAdminToast(`La combinación ${sz} - ${col} ya existe.`, "error");
                                  return;
                                }
                                
                                const newV: ProductVariant = {
                                  size: sz,
                                  color: col,
                                  colorCode: col === "Negro" ? "#000000" : col === "Blanco" ? "#ffffff" : col === "Rojo" ? "#ef4444" : col === "Azul" ? "#3b82f6" : col === "Verde" ? "#22c55e" : col === "Gris" ? "#6b7280" : col === "Beige" ? "#f5f5dc" : col === "Rosa" ? "#f472b6" : "#9ca3af",
                                  sku: sku,
                                  stockPinamar: stkPin,
                                  stockMontevideo: stkMon,
                                  stock: stkPin + stkMon,
                                  priceDelta: 0
                                };
                                const updated = [...current, newV];
                                setNewProduct(updateProductCalculations({
                                  ...newProduct,
                                  variants: updated
                                }));
                                showAdminToast("Combinación añadida", "success");
                              }
                            }}
                            className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold rounded border border-zinc-700 transition cursor-pointer"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>

                      {((newProduct.variants || []).length > 0) ? (
                        <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-lg text-xs shadow-inner">
                          <table className="w-full text-left border-collapse bg-white dark:bg-zinc-950">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[10px] text-zinc-400 font-extrabold uppercase">
                                <th className="p-2">Talle</th>
                                <th className="p-2">Color / Tono</th>
                                <th className="p-2">Código / SKU Variant</th>
                                <th className="p-2">Stock Pinamar</th>
                                <th className="p-2">Stock Montevideo</th>
                                <th className="p-2">Total</th>
                                <th className="p-2">Precio Diferente (Opcional)</th>
                                <th className="p-2">Foto URL (Opcional)</th>
                                <th className="p-2 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(newProduct.variants || []).map((v, i) => (
                                <tr key={i} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 text-slate-700 dark:text-zinc-300">
                                  <td className="p-2 font-mono font-bold text-indigo-500 dark:text-indigo-400">{v.size}</td>
                                  <td className="p-2 flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-800 shadow-sm" style={{ backgroundColor: v.colorCode || '#666' }}></span>
                                    <span>{v.color}</span>
                                  </td>
                                  <td className="p-2 font-mono">
                                    <input
                                      type="text"
                                      placeholder="Código / SKU"
                                      value={v.sku || ""}
                                      onChange={(e) => {
                                        const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                        nextArr[i].sku = e.target.value.trim().toUpperCase();
                                        setNewProduct(updateProductCalculations({
                                          ...newProduct,
                                          variants: nextArr
                                        }));
                                      }}
                                      className="w-44 px-2 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none uppercase text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={v.stockPinamar !== undefined ? v.stockPinamar : v.stock}
                                      onChange={(e) => {
                                        const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                        const sp = Math.max(0, Math.floor(Number(e.target.value || 0)));
                                        const sm = nextArr[i].stockMontevideo !== undefined ? nextArr[i].stockMontevideo : 0;
                                        nextArr[i].stockPinamar = sp;
                                        nextArr[i].stock = sp + sm;
                                        setNewProduct(updateProductCalculations({
                                          ...newProduct,
                                          variants: nextArr
                                        }));
                                      }}
                                      className="w-16 px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={v.stockMontevideo !== undefined ? v.stockMontevideo : 0}
                                      onChange={(e) => {
                                        const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                        const sp = nextArr[i].stockPinamar !== undefined ? nextArr[i].stockPinamar : nextArr[i].stock;
                                        const sm = Math.max(0, Math.floor(Number(e.target.value || 0)));
                                        nextArr[i].stockMontevideo = sm;
                                        nextArr[i].stock = sp + sm;
                                        setNewProduct(updateProductCalculations({
                                          ...newProduct,
                                          variants: nextArr
                                        }));
                                      }}
                                      className="w-16 px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none"
                                    />
                                  </td>
                                  <td className="p-2 font-mono font-bold text-zinc-500">
                                    {v.stock}
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-zinc-400 font-bold">$</span>
                                      <input
                                        type="number"
                                        placeholder="Base"
                                        value={v.price !== undefined ? v.price : ""}
                                        onChange={(e) => {
                                          const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                          const val = e.target.value;
                                          if (val === "") {
                                            delete nextArr[i].price;
                                          } else {
                                            nextArr[i].price = Math.max(0, Number(val));
                                          }
                                          setNewProduct({
                                            ...newProduct,
                                            variants: nextArr
                                          });
                                        }}
                                        className="w-20 px-1 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2">
                                                                        {(() => {
                                      const galleryImages = [newProduct.imageUrl, ...(newProduct.imagenes || [])].filter(Boolean);
                                      return (
                                        <div className="flex flex-col gap-1 max-w-[170px]">
                                          {galleryImages.length > 0 ? (
                                            <select
                                              value={galleryImages.includes(v.imageUrl || "") ? v.imageUrl : (v.imageUrl ? "manual" : "")}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                                if (val === "manual") {
                                                  if (galleryImages.includes(v.imageUrl || "")) {
                                                    nextArr[i].imageUrl = "";
                                                  }
                                                } else {
                                                  nextArr[i].imageUrl = val;
                                                }
                                                setNewProduct({
                                                  ...newProduct,
                                                  variants: nextArr
                                                });
                                              }}
                                              className="px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 rounded text-[11px] outline-none w-full text-slate-800 dark:text-zinc-200"
                                            >
                                              <option value="">-- Sin foto --</option>
                                              {galleryImages.map((img, imgIdx) => (
                                                <option key={imgIdx} value={img}>
                                                  {imgIdx === 0 ? "Foto Principal" : `Foto Adicional ${imgIdx}`}
                                                </option>
                                              ))}
                                              <option value="manual">Otro (Insertar URL)...</option>
                                            </select>
                                          ) : null}

                                          {(galleryImages.length === 0 || !v.imageUrl || !galleryImages.includes(v.imageUrl)) && (
                                            <div className="space-y-1">
                                              <input
                                                type="text"
                                                placeholder="URL de foto..."
                                                value={v.imageUrl || ""}
                                                onChange={(e) => {
                                                  const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                                  nextArr[i].imageUrl = e.target.value.trim();
                                                  setNewProduct({
                                                    ...newProduct,
                                                    variants: nextArr
                                                  });
                                                }}
                                                className="w-full px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-[10px] outline-none font-mono"
                                              />
                                              <div className="flex items-center gap-1 mt-1">
                                                <span className="text-[8px] text-zinc-400 font-bold uppercase shrink-0">Subir:</span>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={async (e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                      const file = e.target.files[0];
                                                      const formData = new FormData();
                                                      formData.append("image", file);
                                                      try {
                                                        const uploadRes = await fetch("/api/cloudinary/upload", {
                                                          method: "POST",
                                                          headers: {
                                                            "Authorization": `Bearer ${localStorage.getItem("apex_admin_token") || ""}`
                                                          },
                                                          body: formData,
                                                        });
const resText = await uploadRes.text();
                                                        let parsedData: any = null;
                                                        
                                                        if (resText.trim().startsWith("<!doctype") || resText.trim().startsWith("<html")) {
                                                          alert("El servidor no pudo subir la imagen. Por favor, verifica que Cloudinary esté configurado en tus Ajustes o reinicia el servidor.");
                                                          return;
                                                        }
                                                        
                                                        try {
                                                          parsedData = JSON.parse(resText);
                                                        } catch (pErr) {
                                                          console.error("Error al parsear respuesta JSON:", pErr);
                                                        }

                                                        if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
                                                          const nextArr = JSON.parse(JSON.stringify(newProduct.variants || []));
                                                          nextArr[i].imageUrl = parsedData.url;
                                                          setNewProduct({
                                                            ...newProduct,
                                                            variants: nextArr
                                                          });
                                                          showToast("¡Imagen de variante cargada con éxito! 🛍️", "success");
                                                        } else {
                                                          showToast((parsedData && parsedData.message) || "Error al subir a Cloudinary.", "error");
                                                        }
                                                      } catch (err) {
                                                        console.error(err);
                                                        showToast("Error al conectar con la API de subida.", "error");
                                                      }
                                                    }
                                                  }}
                                                  className="w-full text-[8px] text-zinc-500 dark:text-zinc-400 file:mr-1 file:py-0.5 file:px-1 file:rounded file:border-0 file:text-[8px] file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:opacity-80 cursor-pointer"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {!!v.imageUrl && (
                                            <div className="flex items-center gap-1 mt-0.5 bg-slate-100/40 dark:bg-zinc-900/40 p-1 rounded border border-slate-200/50 dark:border-zinc-800/30">
                                              <img 
                                                src={v.imageUrl || null} 
                                                alt="preview" 
                                                className="w-6 h-6 object-cover rounded border border-zinc-700/20 shadow-xs shrink-0" 
                                                onError={(e) => { e.target.style.display = 'none'; }} 
                                              />
                                              <span className="text-[9px] text-zinc-500 truncate max-w-[110px]" title={v.imageUrl}>
                                                {v.imageUrl.includes('/') ? v.imageUrl.substring(v.imageUrl.lastIndexOf('/') + 1) : v.imageUrl}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextVariants = (newProduct.variants || []).filter((_, idx) => idx !== i);
                                        setNewProduct({
                                          ...newProduct,
                                          variants: nextVariants,
                                          stock: nextVariants.reduce((sum, item) => sum + item.stock, 0)
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-600 font-bold transition-all cursor-pointer"
                                    >
                                      Remover
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-zinc-500 text-[11px] bg-slate-100/30 dark:bg-zinc-950 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800">
                           Sin combinaciones registradas. Se usará el stock físico general definido arriba. Puedes autogenerarlas o añadirlas manualmente.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {newProductStep === 4 && (
                  <div className="space-y-4 animate-fade-in unique-step-four">
                    {/* General Stock Input (Read Only Visor) */}
                    <div className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2">
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                        <span>Stock Físico General (Pinamar + Montevideo)</span>
                      </label>
                      <div className="text-sm font-bold font-mono text-slate-800 dark:text-zinc-200">
                        {newProduct.stock || 0} unidades disponibles
                      </div>
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans leading-normal">
                        El stock total es calculado de forma automatizada en base a las sucursales definidas en el Paso 2 (Precios y Fotos).
                      </p>
                    </div>

                    <div className="flex flex-col gap-3.5 p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-805">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="newProductIs3D"
                          checked={!!newProduct.is3D}
                          onChange={(e) => setNewProduct({ ...newProduct, is3D: e.target.checked, hoursPerUnit: e.target.checked ? (newProduct.hoursPerUnit || 1) : undefined })}
                          className="rounded border-slate-350 bg-white dark:bg-zinc-950 text-indigo-500 focus:ring-0 cursor-pointer h-4 w-4"
                        />
                        <label htmlFor="newProductIs3D" className="text-xs text-slate-700 dark:text-zinc-300 select-none cursor-pointer font-bold flex items-center gap-1.5 text-indigo-400">
                          <Cpu className="w-4 h-4 shrink-0" />
                          <span>Habilitar Fabricación y Stock 3D Bajo Demanda</span>
                        </label>
                      </div>

                      {newProduct.is3D && (
                        <div className="pl-6 animate-fade-in space-y-2">
                          <label htmlFor="newProductHours" className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                            Demora de fabricación estimada por unidad (en días):
                          </label>
                          <div className="flex items-center gap-2.5">
                            <input
                              type="number"
                              id="newProductHours"
                              min="1"
                              max="100"
                              value={newProduct.hoursPerUnit || 1}
                              onChange={(e) => setNewProduct({ ...newProduct, hoursPerUnit: Math.max(1, Number(e.target.value)) })}
                              className="w-24 px-2.5 py-1.5 rounded bg-white dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#5346ff]"
                            />
                            <span className="text-[11px] text-zinc-500">día(s) de demora.</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/40">
                        <input
                          type="checkbox"
                          id="newProductConsultOnly"
                          checked={!!newProduct.consultOnly}
                          onChange={(e) => setNewProduct({ ...newProduct, consultOnly: e.target.checked })}
                          className="rounded border-slate-350 bg-white dark:bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                        />
                        <label htmlFor="newProductConsultOnly" className="text-xs text-slate-700 dark:text-zinc-300 select-none cursor-pointer font-bold flex items-center gap-1.5 text-emerald-400">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>Sólo Consulta (Sustituye botón de Comprar por Consultar vía WhatsApp)</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="newProductFeatured"
                        checked={!!newProduct.featured}
                        onChange={(e) => setNewProduct({ ...newProduct, featured: e.target.checked })}
                        className="rounded border-slate-350 bg-white dark:bg-zinc-950 text-indigo-500 focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <label htmlFor="newProductFeatured" className="text-xs text-slate-700 dark:text-zinc-300 select-none cursor-pointer font-semibold">
                         Marcar este producto como "Destacado" (aparece primero en portada)
                      </label>
                    </div>
                  </div>
                )}

                {/* Step Wizard Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-zinc-850 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewProductMode(false);
                      setNewProductStep(1);
                    }}
                    className="px-4 py-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <div className="flex items-center gap-2">
                    {newProductStep > 1 && (
                      <button
                        type="button"
                        onClick={() => setNewProductStep(newProductStep - 1)}
                        className="px-4 py-1.5 bg-white dark:bg-zinc-950 border border-slate-205 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Anterior
                      </button>
                    )}
                    {newProductStep < 4 ? (
                      <button
                        key="btn-new-next"
                        type="button"
                        onClick={() => {
                          if (newProductStep === 1) {
                            if (!newProduct.name || !newProduct.name.trim()) {
                              setNewProductErrors({ name: "El nombre es obligatorio." });
                              return;
                            }
                            if (!newProduct.categoria_id) {
                              setNewProductErrors({ category: "La categoría principal es obligatoria." });
                              return;
                            }
                          }
                          if (newProductStep === 2) {
                            if (newProduct.price === undefined || newProduct.price === null || isNaN(newProduct.price) || newProduct.price <= 0) {
                              setNewProductErrors({ price: "El precio de venta es obligatorio y debe ser mayor a 0." });
                              return;
                            }
                          }
                          setNewProductErrors({});
                          setNewProductStep(newProductStep + 1);
                        }}
                        className="px-4 py-1.5 bg-[#5346ff] hover:bg-[#5346ff]/90 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                      >
                        Siguiente
                      </button>
                    ) : (
                      <button
                        key="btn-new-submit"
                        type="button"
                        onClick={handleCreateProduct}
                        disabled={saving}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                      >
                        <span>{saving ? "Creando..." : "Crear Artículo ✅"}</span>
                      </button>
                    )}
                  </div>
                </div>
                  </form>
                )}

                {/* 4. EDIT PRODUCT FORM DISPLAY */}
                {adminSection === "products" && editingProduct && (
                  <form
                    onSubmit={(e) => e.preventDefault()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
                        e.preventDefault();
                      }
                    }}
                    className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Edit className="h-4 w-4 text-amber-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Modificar Detalles de Producto</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setEditingProductStep(1);
                        }}
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors uppercase font-bold tracking-wider"
                      >
                        Cancelar
                      </button>
                    </div>

                    {/* Step-by-Step progress tabs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-805 p-1 rounded-xl gap-1">
                      {[
                        { step: 1, label: "Info Básica", icon: "📋" },
                        { step: 2, label: "Precios y Fotos", icon: "💰" },
                        { step: 3, label: "Variantes", icon: "✨" },
                        { step: 4, label: "Inventario y Envío", icon: "⚙️" }
                      ].map((s) => (
                        <button
                          key={s.step}
                          type="button"
                          onClick={() => {
                            if (s.step > 1 && (!editingProduct.name || !editingProduct.name.trim())) {
                              setEditProductErrors({ name: "El nombre es obligatorio antes de avanzar." });
                              setEditingProductStep(1);
                              return;
                            }
                            if (s.step > 1 && !editingProduct.categoria_id) {
                              setEditProductErrors({ category: "La categoría principal es obligatoria." });
                              setEditingProductStep(1);
                              return;
                            }
                            setEditProductErrors({});
                            setEditingProductStep(s.step);
                          }}
                          className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-bold transition duration-200 cursor-pointer ${
                            editingProductStep === s.step
                              ? "bg-amber-500 text-slate-950 shadow-sm font-extrabold"
                              : "text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-850"
                          }`}
                        >
                          <span className="font-mono text-xs">{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Global Form Validation Info Banner */}
                    {Object.keys(editProductErrors).length > 0 && (
                      <div className="p-3 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-lg text-red-700 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>
                        <span>Corrige los avisos antes de avanzar: {Object.values(editProductErrors).join(" | ")}</span>
                      </div>
                    )}

                    {editingProductStep === 1 && (
                      <div className="space-y-4 animate-fade-in unique-step-one">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Nombre del Producto *</label>
                        <input
                          required
                          type="text"
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Categoría Principal *</label>
                        <select
                          required
                          value={editingProduct.categoria_id || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const match = (store.dbCategories || []).find(c => c.id === val);
                            const isCategory3D = !!match && (
                              match.nombre.toLowerCase().includes("3d") ||
                              match.nombre.toLowerCase().includes("impresión") ||
                              match.nombre.toLowerCase().includes("impresion") ||
                              match.nombre.toLowerCase().includes("impreción") ||
                              match.nombre.toLowerCase().includes("imprecion")
                            );
                            const currentSizes = editingProduct.sizes || [];
                            const needsDefaultMaterials = isCategory3D && (currentSizes.length === 0 || currentSizes.includes("S") || currentSizes.includes("M") || currentSizes.includes("L") || currentSizes.includes("Único"));
                            setEditingProduct({ 
                              ...editingProduct, 
                              categoria_id: val, 
                              category: match ? match.nombre : "",
                              subcategoria_id: "all", // Reset subcategory selection
                              is3D: isCategory3D ? true : editingProduct.is3D,
                              hoursPerUnit: isCategory3D ? (editingProduct.hoursPerUnit || 1) : editingProduct.hoursPerUnit,
                              sizes: needsDefaultMaterials ? ["PLA", "PETG", "ABS", "TPU"] : currentSizes
                            });
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-bold"
                        >
                          <option value="">-- Elige categoría --</option>
                          {(store.dbCategories || [])
                            .sort((a,b) => (a.orden || 0)  - (b.orden || 0))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre} {c.active === false ? " (Inactiva)" : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Subcategoría Relacionada</label>
                        <select
                          value={editingProduct.subcategoria_id || "all"}
                          onChange={(e) => setEditingProduct({ ...editingProduct, subcategoria_id: e.target.value })}
                          disabled={!editingProduct.categoria_id}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-all font-semibold"
                        >
                          <option value="all">Sin subcategoría / General</option>
                          {(store.dbSubcategories || [])
                            .filter(s => s.categoria_id === editingProduct.categoria_id)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.nombre} {s.active === false ? " (Inactiva)" : ""}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Categorías y Subcategorías Adicionales / Secundarias para Editar Producto */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Categorías secundarias adicionales para Editar Producto */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex flex-col">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                          Categorías Adicionales / Secundarias <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">(elige del menú desplegable)</span>
                        </label>
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const list = editingProduct.categorias_adicionales || [];
                              if (!list.includes(val)) {
                                setEditingProduct({
                                  ...editingProduct,
                                  categorias_adicionales: [...list, val]
                                });
                              }
                            }
                          }}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white transition-all font-semibold cursor-pointer"
                        >
                          <option value="">-- Seleccionar categoría adicional --</option>
                          {(store.dbCategories || [])
                            .sort((a,b) => (a.orden || 0) - (b.orden || 0))
                            .filter(c => c.id !== editingProduct.categoria_id && !(editingProduct.categorias_adicionales && editingProduct.categorias_adicionales.includes(c.id)))
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nombre}
                              </option>
                            ))}
                        </select>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {(editingProduct.categorias_adicionales || []).map((catId) => {
                            const cat = (store.dbCategories || []).find(c => c.id === catId);
                            if (!cat) return null;
                            return (
                              <span
                                key={catId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#5346ff]/10 text-[#5346ff] dark:bg-[#5346ff]/20 dark:text-[#9086ff] border border-[#5346ff]/30 rounded-lg text-xs font-semibold"
                              >
                                <span>{cat.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct({
                                      ...editingProduct,
                                      categorias_adicionales: (editingProduct.categorias_adicionales || []).filter(id => id !== catId)
                                    });
                                  }}
                                  className="text-sm font-bold hover:text-red-500 transition-colors ml-1 focus:outline-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                          {(editingProduct.categorias_adicionales || []).length === 0 && (
                            <span className="text-[10px] text-zinc-400 italic">No hay categorías adicionales seleccionadas.</span>
                          )}
                        </div>
                      </div>

                      {/* Subcategorías secundarias adicionales para Editar Producto */}
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex flex-col">
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                          Subcategorías Adicionales / Secundarias <span className="text-zinc-400 dark:text-zinc-500 font-normal lowercase">(elige categoría principal primero)</span>
                        </label>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          <div>
                            <select
                              value={editSubSecCategoryFilter}
                              onChange={(e) => setEditSubSecCategoryFilter(e.target.value)}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white transition-all font-semibold cursor-pointer"
                            >
                              <option value="">-- Categoría de Filtro --</option>
                              {(store.dbCategories || [])
                                .sort((a,b) => (a.orden || 0) - (b.orden || 0))
                                .map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <select
                              value=""
                              disabled={!editSubSecCategoryFilter}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const list = editingProduct.subcategorias_adicionales || [];
                                  if (!list.includes(val)) {
                                    setEditingProduct({
                                      ...editingProduct,
                                      subcategorias_adicionales: [...list, val]
                                    });
                                  }
                                }
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-all font-semibold cursor-pointer"
                            >
                              <option value="">-- Elige Subcategoría --</option>
                              {(store.dbSubcategories || [])
                                .filter(s => s.categoria_id === editSubSecCategoryFilter && s.id !== editingProduct.subcategoria_id && !(editingProduct.subcategorias_adicionales && editingProduct.subcategorias_adicionales.includes(s.id)))
                                .map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.nombre}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {(editingProduct.subcategorias_adicionales || []).map((subId) => {
                            const sub = (store.dbSubcategories || []).find(s => s.id === subId);
                            if (!sub) return null;
                            const cat = (store.dbCategories || []).find(c => c.id === sub.categoria_id);
                            return (
                              <span
                                key={subId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#5346ff]/10 text-[#5346ff] dark:bg-[#5346ff]/20 dark:text-[#9086ff] border border-[#5346ff]/30 rounded-lg text-xs font-semibold"
                              >
                                <span className="text-[10px] opacity-75 mr-1 font-mono uppercase">
                                  {cat ? cat.nombre : ""}
                                </span>
                                <span>{sub.nombre}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingProduct({
                                      ...editingProduct,
                                      subcategorias_adicionales: (editingProduct.subcategorias_adicionales || []).filter(id => id !== subId)
                                    });
                                  }}
                                  className="text-sm font-bold hover:text-red-500 transition-colors ml-1 focus:outline-none cursor-pointer"
                                >
                                  ×
                                </button>
                              </span>
                            );
                          })}
                          {(editingProduct.subcategorias_adicionales || []).length === 0 && (
                            <span className="text-[10px] text-zinc-400 italic">No hay subcategorías adicionales seleccionadas.</span>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>
                    )}

                    {editingProductStep === 2 && (
                      <div className="space-y-6 animate-fade-in unique-step-two">
                        
                        {/* Finanzas y Precios */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 space-y-4">
                          <h4 className="text-xs font-black text-indigo-500 uppercase tracking-wider flex items-center gap-2">
                            <span>💵</span> Finanzas, Costos y Precios
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Precio Compra ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingProduct.precioCompra || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setEditingProduct(updateProductCalculations({ ...editingProduct, precioCompra: val }) as Product);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Costo de compra"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span>Precio con 40%</span>
                                <span className="text-[8px] bg-slate-100 dark:bg-zinc-800 px-1 py-0.2 rounded font-normal lowercase text-slate-500">auto</span>
                              </label>
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={editingProduct.precioCon40 || ""}
                                className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-850 rounded-lg text-xs text-slate-500 font-mono font-bold cursor-not-allowed select-none"
                                placeholder="Precio Compra + 40%"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Descuento (%)</label>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={editingProduct.descuentoPorcentaje || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Math.min(99, Math.max(0, Number(e.target.value)));
                                  setEditingProduct(updateProductCalculations({ ...editingProduct, descuentoPorcentaje: val }) as Product);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-indigo-600 dark:text-indigo-400 font-mono font-bold"
                                placeholder="Ej. 15%"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Comisión ML ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingProduct.comisionML || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setEditingProduct(updateProductCalculations({ ...editingProduct, comisionML: val }) as Product);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Comisión de MercadoLibre"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Precio Venta ML ($)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editingProduct.precioVentaML || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setEditingProduct(updateProductCalculations({ ...editingProduct, precioVentaML: val }) as Product);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Precio en MercadoLibre"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-[#5346ff] dark:text-[#9086ff] uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span>Precio Web ($)</span>
                                <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/50 px-1 py-0.2 rounded font-normal lowercase text-indigo-500">auto</span>
                              </label>
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={editingProduct.precioWeb || ""}
                                className="w-full px-3 py-2 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-900/50 rounded-lg text-xs text-indigo-600 dark:text-indigo-400 font-mono font-black cursor-not-allowed select-none"
                                placeholder="Calculado: ML - Comisión"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Distribución de Stock */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 space-y-4">
                          <h4 className="text-xs font-black text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                            <span>📦</span> Almacenes y Stock por Sucursal
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Stock Pinamar</label>
                              <input
                                type="number"
                                min="0"
                                value={editingProduct.stockPinamar || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setEditingProduct(updateProductCalculations({ ...editingProduct, stockPinamar: val }) as Product);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Unidades en Pinamar"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Stock Montevideo</label>
                              <input
                                type="number"
                                min="0"
                                value={editingProduct.stockMontevideo || ""}
                                onChange={(e) => {
                                  const val = e.target.value === "" ? 0 : Number(e.target.value);
                                  setEditingProduct(updateProductCalculations({ ...editingProduct, stockMontevideo: val }) as Product);
                                }}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono font-bold"
                                placeholder="Unidades en Montevideo"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-extrabold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span>Stock Total Actual</span>
                                <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/50 px-1 py-0.2 rounded font-normal lowercase text-emerald-500">auto</span>
                              </label>
                              <input
                                type="number"
                                readOnly
                                disabled
                                value={editingProduct.stockTotalActual || ""}
                                className="w-full px-3 py-2 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-lg text-xs text-emerald-600 dark:text-emerald-400 font-mono font-extrabold cursor-not-allowed select-none"
                                placeholder="Calculado: Suma stock"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Galería de imágenes */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 space-y-4">
                          <h4 className="text-xs font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                            <span>🖼</span> Galería de Fotos del Artículo
                          </h4>
                          <ImageGalleryEditor
                            images={[editingProduct.imageUrl || "", ...(editingProduct.imagenes || [])].filter(Boolean)}
                            onChange={(updatedImages) => {
                              setEditingProduct({
                                ...editingProduct,
                                imageUrl: updatedImages[0] || "",
                                imagenes: updatedImages.slice(1)
                              });
                            }}
                            isThemeDark={store.settings.themeMode === "dark"}
                          />
                        </div>
                      </div>
                    )}

                    {editingProductStep === 1 && (
                      <div className="space-y-4 animate-fade-in unique-step-one-desc mt-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Descripción Detallada</label>
                          <textarea
                            value={editingProduct.description}
                            onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white resize-none"
                          />
                        </div>
                      </div>
                    )}

                    {/* Talles y Colores Configuration Panel */}
                    {editingProductStep === 3 && (
                      <>
                        <div className="flex flex-col gap-6 border border-indigo-500/10 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40">
                      <div>
                        {editingProduct.is3D || is3DProduct(editingProduct) ? (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                              Materiales 3D Disponibles
                            </label>
                            <input
                              type="text"
                              value={(editingProduct.sizes || []).join(", ")}
                              onChange={(e) => {
                                const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                setEditingProduct({ ...editingProduct, sizes: arr });
                              }}
                              placeholder="p.ej. PLA, PETG, ABS, TPU (Separados por comas)"
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white mb-2"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[9px] text-zinc-500 mr-1 self-center">Preajustes rápidos:</span>
                              {["PLA", "PETG", "ABS", "TPU"].map((mat) => {
                                const isSelected = (editingProduct.sizes || []).includes(mat);
                                return (
                                  <button
                                    type="button"
                                    key={mat}
                                    onClick={() => {
                                      const current = editingProduct.sizes || [];
                                      const next = current.includes(mat)
                                        ? current.filter(x => x !== mat)
                                        : [...current, mat];
                                      setEditingProduct({ ...editingProduct, sizes: next });
                                    }}
                                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${
                                      isSelected 
                                        ? "bg-indigo-600 text-white font-bold" 
                                        : "bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    {mat}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ) : (editingProduct.categoria_id === "ropa" || (editingProduct.category || "").toLowerCase().includes("ropa") || (editingProduct.category || "").toLowerCase().includes("indumentaria")) ? (
                          <div className="space-y-3 p-3 bg-white/50 dark:bg-zinc-950/40 rounded-xl border border-slate-200/60 dark:border-zinc-800">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-extrabold text-[#5346ff] dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Ruler className="w-3.5 h-3.5" />
                                <span>Guía de Tallas (Ropa)</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                  (editingProduct.sizeChartEnabled !== false)
                                    ? "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : "text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400"
                                }`}>
                                  {(editingProduct.sizeChartEnabled !== false) ? "Activado" : "Desactivado"}
                                </span>
                                <input 
                                  type="checkbox"
                                  checked={editingProduct.sizeChartEnabled !== false}
                                  onChange={(e) => {
                                    setEditingProduct({ ...editingProduct, sizeChartEnabled: e.target.checked });
                                  }}
                                  className="h-4 w-4 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                />
                              </div>
                            </div>
                            
                            {(editingProduct.sizeChartEnabled !== false) ? (
                              <div className="space-y-4">
                                {/* Dynamic Tabs Visibility Control */}
                                <div className="p-3 bg-indigo-50/40 dark:bg-zinc-900/40 rounded-xl border border-indigo-500/10 space-y-2 mb-2">
                                  <p className="text-[10px] font-bold text-[#5346ff] dark:text-indigo-400 uppercase tracking-wider">
                                    Pestañas visibles en la guía de tallas:
                                  </p>
                                  <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={editingProduct.sizeChartShowSuperior !== false}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, sizeChartShowSuperior: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">👕 Superiores</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={editingProduct.sizeChartShowInferior !== false}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, sizeChartShowInferior: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">👖 Inferiores</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={editingProduct.sizeChartShowCalzado !== false}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, sizeChartShowCalzado: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">👟 Calzado</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-zinc-950 p-2 rounded-lg border border-slate-200/60 dark:border-zinc-800/80 hover:border-indigo-500/30 transition-all">
                                      <input 
                                        type="checkbox"
                                        checked={editingProduct.sizeChartShowRecommender !== false}
                                        onChange={(e) => setEditingProduct({ ...editingProduct, sizeChartShowRecommender: e.target.checked })}
                                        className="h-3.5 w-3.5 text-[#5346ff] focus:ring-[#5346ff] border-slate-300 dark:border-zinc-700 rounded cursor-pointer"
                                      />
                                      <span className="text-xs text-slate-700 dark:text-zinc-300">📏 Calculador</span>
                                    </label>
                                  </div>
                                </div>

                                <p className="text-[10px] text-slate-800 dark:text-zinc-300 leading-normal mb-1">
                                  <strong>1. Selecciona los talles activos:</strong> Selecciona de los preajustes o añade talles personalizados.
                                </p>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {(() => {
                                    const currentSizes = editingProduct.sizes || [];
                                    const fallbackStandard = ["S", "M", "L", "XL", "XXL", "Único"];
                                    const allSizes = Array.from(new Set([...fallbackStandard, ...currentSizes]));
                                    
                                    return allSizes.map((sz) => {
                                      const isActive = currentSizes.includes(sz);
                                      return (
                                        <div 
                                          key={sz}
                                          className={`p-1.5 rounded-lg border transition-all flex items-center justify-between gap-1 ${
                                            isActive 
                                              ? "bg-white dark:bg-zinc-900 border-[#5346ff]/35 shadow-xs text-[#5346ff] dark:text-indigo-400 font-bold animate-fade-in" 
                                              : "bg-slate-100/50 dark:bg-zinc-950/20 border-transparent text-zinc-400 opacity-60"
                                          }`}
                                        >
                                          <div className="flex items-center gap-1.5 flex-grow min-w-0">
                                            <input 
                                              type="checkbox"
                                              checked={isActive}
                                              onChange={() => {
                                                const next = isActive 
                                                  ? currentSizes.filter(x => x !== sz)
                                                  : [...currentSizes, sz];
                                                setEditingProduct({ ...editingProduct, sizes: next });
                                              }}
                                              className="h-3 w-3 rounded border-slate-300 dark:border-zinc-700 text-[#5346ff] focus:ring-[#5346ff] cursor-pointer"
                                            />
                                            <span className="text-xs truncate">{sz}</span>
                                          </div>
                                          {!fallbackStandard.includes(sz) && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next = currentSizes.filter(x => x !== sz);
                                                setEditingProduct({ ...editingProduct, sizes: next });
                                              }}
                                              className="text-red-500 hover:text-red-700 text-xs font-bold px-1 cursor-pointer"
                                              title="Eliminar talle"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      );
                                    });
                                  })()}
                                </div>

                                <div className="flex gap-1 items-center">
                                  <input 
                                    type="text"
                                    id="add-new-custom-size-input-edit"
                                    placeholder="Ej: 38, XS, Especial"
                                    className="w-full px-2 py-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-xs outline-none text-slate-900 dark:text-white"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        const val = e.currentTarget.value.trim();
                                        if (val) {
                                          const current = editingProduct.sizes || [];
                                          if (!current.includes(val)) {
                                            setEditingProduct({ ...editingProduct, sizes: [...current, val] });
                                          }
                                          e.currentTarget.value = "";
                                        }
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById("add-new-custom-size-input-edit") as HTMLInputElement;
                                      const val = input?.value?.trim();
                                      if (val) {
                                        const current = editingProduct.sizes || [];
                                        if (!current.includes(val)) {
                                          setEditingProduct({ ...editingProduct, sizes: [...current, val] });
                                        }
                                        if (input) input.value = "";
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-[#5346ff] text-white hover:bg-[#4336ee] rounded-md text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                  >
                                    + Agregar talle
                                  </button>
                                </div>

                                <hr className="border-slate-200 dark:border-zinc-800" />

                                <p className="text-[10px] text-slate-800 dark:text-zinc-300 leading-normal">
                                  <strong>2. Completa las medidas de la tabla:</strong> Agrega columnas editables (Ej: Ancho, Largo, Cadera, Manga) y pon la medida de cada talle.
                                </p>

                                {(() => {
                                  const sizesList = editingProduct.sizes || [];
                                  if (sizesList.length === 0) {
                                    return (
                                      <p className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400 p-2.5 rounded-lg font-medium text-center">
                                        Selecciona al menos un talle arriba para rellenar las medidas de la tabla.
                                      </p>
                                    );
                                  }

                                  const chartObj = getProductSizeChartData(editingProduct);
                                  const cols = chartObj.columns;
                                  const mRows = chartObj.rows;

                                  return (
                                    <div className="space-y-2">
                                      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-zinc-800 max-w-full">
                                        <table className="w-full text-left border-collapse text-[11px]">
                                          <thead>
                                            <tr className="bg-slate-100/90 dark:bg-zinc-900/60 text-slate-800 dark:text-zinc-200">
                                              {cols.map((colName, colIdx) => (
                                                <th key={colName} className="p-1.5 border-r border-slate-200 dark:border-zinc-800 font-bold whitespace-nowrap">
                                                  <div className="flex items-center justify-between gap-1 min-w-[70px]">
                                                    <span>{colName}</span>
                                                    {colIdx > 0 && (
                                                      <button
                                                        type="button"
                                                        onClick={() => {
                                                          const nextCols = cols.filter(c => c !== colName);
                                                          const nextRows = mRows.map(r => {
                                                            const copy = { ...r };
                                                            delete copy[colName];
                                                            return copy;
                                                          });
                                                          setEditingProduct({
                                                            ...editingProduct,
                                                            sizeChartData: { columns: nextCols, rows: nextRows }
                                                          });
                                                        }}
                                                        className="text-red-500 hover:text-red-700 text-xs font-bold px-0.5"
                                                        title="Eliminar columna"
                                                      >
                                                        ×
                                                      </button>
                                                    )}
                                                  </div>
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                                            {mRows.map((rowObj) => {
                                              const sizeVal = rowObj["Talle"];
                                              return (
                                                <tr key={sizeVal} className="hover:bg-slate-50 dark:hover:bg-zinc-900/50">
                                                  {cols.map((colName) => {
                                                    if (colName === "Talle") {
                                                      return (
                                                        <td key={colName} className="p-1.5 font-bold text-[#5346ff] border-r border-slate-200 dark:border-zinc-800 bg-slate-50/55 dark:bg-zinc-900/20">
                                                          {sizeVal}
                                                        </td>
                                                      );
                                                    }

                                                    const cellVal = rowObj[colName] || "";
                                                    return (
                                                      <td key={colName} className="p-1 border-r border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20">
                                                        <input
                                                          type="text"
                                                          value={cellVal}
                                                          onChange={(e) => {
                                                            const updatedRows = mRows.map(r => {
                                                              if (r["Talle"] === sizeVal) {
                                                                return { ...r, [colName]: e.target.value };
                                                              }
                                                              return r;
                                                            });
                                                            setEditingProduct({
                                                              ...editingProduct,
                                                              sizeChartData: { columns: cols, rows: updatedRows }
                                                            });
                                                          }}
                                                          placeholder="ej: 50 cm"
                                                          className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/80 rounded px-1.5 py-0.5 text-[11px] outline-none text-slate-950 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>

                                      <div className="flex gap-1.5 items-center justify-end pt-1">
                                        <input 
                                          type="text"
                                          id="add-new-column-input-edit"
                                          placeholder="Ej: Ancho (cm), Manga"
                                          className="px-2 py-0.5 max-w-[170px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-md text-[10px] outline-none"
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              e.preventDefault();
                                              const val = e.currentTarget.value.trim();
                                              if (val && !cols.includes(val)) {
                                                setEditingProduct({
                                                  ...editingProduct,
                                                  sizeChartData: {
                                                    columns: [...cols, val],
                                                    rows: mRows.map(r => ({ ...r, [val]: "" }))
                                                  }
                                                });
                                                e.currentTarget.value = "";
                                              }
                                            }
                                          }}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const input = document.getElementById("add-new-column-input-edit") as HTMLInputElement;
                                            const val = input?.value?.trim();
                                            if (val && !cols.includes(val)) {
                                              setEditingProduct({
                                                ...editingProduct,
                                                sizeChartData: {
                                                  columns: [...cols, val],
                                                  rows: mRows.map(r => ({ ...r, [val]: "" }))
                                                }
                                              });
                                              if (input) input.value = "";
                                            }
                                          }}
                                          className="px-2 py-0.5 bg-slate-200 dark:bg-zinc-800 hover:bg-[#c9c3ff] dark:hover:bg-zinc-700 text-zinc-755 dark:text-zinc-200 rounded-md text-[10px] font-bold cursor-pointer whitespace-nowrap"
                                        >
                                          + Agregar medida
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <div className="p-3 text-center bg-slate-100 dark:bg-zinc-950/20 text-zinc-500 rounded-xl border border-slate-200 dark:border-zinc-800">
                                <p className="text-[11px] font-medium">Guía de tallas desactivada para este producto.</p>
                                <p className="text-[9.5px] text-zinc-400 mt-1">El botón de "Guía de talles" no estará visible en la página de detalles para este producto.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Talles / Tamaños Disponibles</label>
                            <input
                              type="text"
                              value={(editingProduct.sizes || []).join(", ")}
                              onChange={(e) => {
                                const arr = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                setEditingProduct({ ...editingProduct, sizes: arr });
                              }}
                              placeholder="p.ej. S, M, L, XL (Separados por comas)"
                              className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white mb-2"
                            />
                            <div className="flex flex-wrap gap-1.5">
                              <span className="text-[9px] text-zinc-500 mr-1 self-center">Preajustes rápidos:</span>
                              {["S", "M", "L", "XL", "XXL", "Único"].map((sz) => {
                                const isSelected = (editingProduct.sizes || []).includes(sz);
                                return (
                                  <button
                                    type="button"
                                    key={sz}
                                    onClick={() => {
                                      const current = editingProduct.sizes || [];
                                      const next = current.includes(sz)
                                        ? current.filter(x => x !== sz)
                                        : [...current, sz];
                                      setEditingProduct({ ...editingProduct, sizes: next });
                                    }}
                                    className={`text-[9.5px] font-mono px-2 py-0.5 rounded cursor-pointer transition-all ${
                                      isSelected 
                                        ? "bg-indigo-600 text-white font-bold" 
                                        : "bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                    }`}
                                  >
                                    {sz}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Colores Disponibles</label>
                        <input
                          type="text"
                          value={(editingProduct.colors || []).join(", ")}
                          onChange={(e) => {
                            const arr = e.target.value.split(",").map(c => c.trim()).filter(Boolean);
                            setEditingProduct({ ...editingProduct, colors: arr });
                          }}
                          placeholder="p.ej. Negro, Blanco, Gris, Rojo (Separados por comas)"
                          className="w-full px-3 py-2 bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white mb-2"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <span className="text-[9px] text-zinc-500 mr-1 self-center">Preajustes rápidos:</span>
                          {["Negro", "Blanco", "Gris", "Azul", "Rojo", "Verde", "Beige", "Rosa"].map((col) => {
                            const isSelected = (editingProduct.colors || []).includes(col);
                            return (
                              <button
                                type="button"
                                key={col}
                                onClick={() => {
                                  const current = editingProduct.colors || [];
                                  const next = current.includes(col)
                                    ? current.filter(x => x !== col)
                                    : [...current, col];
                                  setEditingProduct({ ...editingProduct, colors: next });
                                }}
                                className={`text-[9.5px] px-2 py-0.5 rounded cursor-pointer transition-all ${
                                  isSelected 
                                    ? "bg-indigo-600 text-white font-bold" 
                                    : "bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                                }`}
                              >
                                {col}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* PRODUCT COMBINATIONS VARIANT STOCK MANAGER FOR EDITING */}
                    <div className="border border-indigo-500/10 p-4 rounded-xl bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                            Gestor de Stock de Variantes (Combinación Exacto)
                          </label>
                          <p className="text-[9px] text-zinc-400 mt-0.5 font-sans">Asigna inventarios individuales por talle, color y sucursal, y un precio diferente por variante si lo requiere</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const curSizes = editingProduct.sizes || [];
                            const curColors = editingProduct.colors || [];
                            if (curSizes.length === 0 && curColors.length === 0) {
                              showAdminToast("Primero ingresa talles o colores arriba para generar combinaciones.", "error");
                              return;
                            }
                            
                            const generated: ProductVariant[] = [];
                            const sizesList = curSizes.length > 0 ? curSizes : ["Único"];
                            const colorsList = curColors.length > 0 ? curColors : ["General"];
                            
                            let isFirst = (editingProduct.variants || []).length === 0;
                            const currentSkus = (editingProduct.variants || []).map(v => v.sku).filter(Boolean) as string[];

                            for (const sz of sizesList) {
                              for (const col of colorsList) {
                                const exists = (editingProduct.variants || []).some(v => v.size === sz && v.color === col);
                                if (!exists) {
                                  const nextNum = getNextAvailableSKUNumber(store.products, currentSkus);
                                  const generatedSku = `J${String(nextNum).padStart(3, '0')}`;
                                  currentSkus.push(generatedSku);
                                  const sp = Math.floor(Number(editingProduct.stockPinamar !== undefined ? editingProduct.stockPinamar : 5));
                                  const sm = Math.floor(Number(editingProduct.stockMontevideo !== undefined ? editingProduct.stockMontevideo : 0));
                                  generated.push({
                                    size: sz,
                                    color: col,
                                    colorCode: col === "Negro" ? "#000000" : col === "Blanco" ? "#ffffff" : col === "Rojo" ? "#ef4444" : col === "Azul" ? "#3b82f6" : col === "Verde" ? "#22c55e" : col === "Gris" ? "#6b7280" : col === "Beige" ? "#f5f5dc" : col === "Rosa" ? "#f472b6" : "#9ca3af",
                                    sku: generatedSku,
                                    stockPinamar: sp,
                                    stockMontevideo: sm,
                                    stock: sp + sm,
                                    priceDelta: 0
                                  });
                                }
                              }
                            }
                            
                            const combined = [...(editingProduct.variants || []), ...generated];
                            setEditingProduct(updateProductCalculations({
                              ...editingProduct,
                              variants: combined
                            }) as Product);
                            showAdminToast(`Se autogeneraron ${generated.length} combinaciones con códigos sugeridos.`, "success");
                          }}
                          className="text-[9px] px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded shadow transition-all cursor-pointer self-start sm:self-center"
                        >
                          Generar Todas las Combinaciones
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 bg-slate-100/30 dark:bg-zinc-950 p-2.5 rounded-lg border border-slate-200/80">
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Talle</label>
                          <select
                            id="edit-var-size"
                            value={editVarSize}
                            onChange={(e) => setEditVarSize(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            {((editingProduct.sizes || []).length > 0 ? (editingProduct.sizes || []) : ["Único"]).map(sz => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Color</label>
                          <select
                            id="edit-var-color"
                            value={editVarColor}
                            onChange={(e) => setEditVarColor(e.target.value)}
                            className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-semibold text-zinc-800 dark:text-zinc-200"
                          >
                            {((editingProduct.colors || []).length > 0 ? (editingProduct.colors || []) : ["General"]).map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Código / SKU Variant (Sistema)</label>
                          <input
                            id="edit-var-sku"
                            type="text"
                            readOnly
                            value={(() => {
                              const currentEditSkus = (editingProduct.variants || []).map(v => v.sku).filter(Boolean) as string[];
                              const nextEditNum = getNextAvailableSKUNumber(store.products, currentEditSkus);
                              return `J${String(nextEditNum).padStart(3, '0')}`;
                            })()}
                            className="w-full text-xs bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-1 rounded font-semibold font-mono text-zinc-500 dark:text-zinc-400 uppercase cursor-not-allowed opacity-75"
                            placeholder="Autogenerado"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Stock Pinamar</label>
                          <input id="edit-var-stock-pinamar" type="number" defaultValue="5" className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-mono font-bold" />
                        </div>
                        <div>
                          <label className="block text-[9px] text-zinc-400 capitalize mb-0.5">Stock Montevideo</label>
                          <input id="edit-var-stock-montevideo" type="number" defaultValue="0" className="w-full text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-1 rounded font-mono font-bold" />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => {
                              const szEl = document.getElementById('edit-var-size') as HTMLSelectElement;
                              const colEl = document.getElementById('edit-var-color') as HTMLSelectElement;
                              const stkPinEl = document.getElementById('edit-var-stock-pinamar') as HTMLInputElement;
                              const stkMonEl = document.getElementById('edit-var-stock-montevideo') as HTMLInputElement;
                              
                              if (szEl && colEl && stkPinEl && stkMonEl) {
                                const sz = szEl.value;
                                const col = colEl.value;
                                const currentEditSkus = (editingProduct.variants || []).map(v => v.sku).filter(Boolean) as string[];
                                const nextEditNum = getNextAvailableSKUNumber(store.products, currentEditSkus);
                                const sku = `J${String(nextEditNum).padStart(3, '0')}`;
                                const stkPin = Math.max(0, Math.floor(Number(stkPinEl.value || 0)));
                                const stkMon = Math.max(0, Math.floor(Number(stkMonEl.value || 0)));
                                
                                const current = editingProduct.variants || [];
                                if (current.some(v => v.size === sz && v.color === col)) {
                                  showAdminToast(`La combinación ${sz} - ${col} ya existe.`, "error");
                                  return;
                                }
                                
                                const newV: ProductVariant = {
                                  size: sz,
                                  color: col,
                                  colorCode: col === "Negro" ? "#000000" : col === "Blanco" ? "#ffffff" : col === "Rojo" ? "#ef4444" : col === "Azul" ? "#3b82f6" : col === "Verde" ? "#22c55e" : col === "Gris" ? "#6b7280" : col === "Beige" ? "#f5f5dc" : col === "Rosa" ? "#f472b6" : "#9ca3af",
                                  sku: sku,
                                  stockPinamar: stkPin,
                                  stockMontevideo: stkMon,
                                  stock: stkPin + stkMon,
                                  priceDelta: 0
                                };
                                const updated = [...current, newV];
                                setEditingProduct(updateProductCalculations({
                                  ...editingProduct,
                                  variants: updated
                                }) as Product);
                                showAdminToast("Combinación añadida", "success");
                              }
                            }}
                            className="w-full py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-bold rounded border border-zinc-700 transition cursor-pointer"
                          >
                            + Añadir
                          </button>
                        </div>
                      </div>

                      {((editingProduct.variants || []).length > 0) ? (
                        <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-zinc-800 rounded-lg text-xs shadow-inner">
                          <table className="w-full text-left border-collapse bg-white dark:bg-zinc-950">
                            <thead>
                              <tr className="bg-slate-100 dark:bg-zinc-900/60 border-b border-slate-200 dark:border-zinc-800 text-[10px] text-zinc-400 font-extrabold uppercase">
                                <th className="p-2">Talle</th>
                                <th className="p-2">Color / Tono</th>
                                <th className="p-2">Código / SKU Variant</th>
                                <th className="p-2">Stock Pinamar</th>
                                <th className="p-2">Stock Montevideo</th>
                                <th className="p-2">Total</th>
                                <th className="p-2">Precio Diferente (Opcional)</th>
                                <th className="p-2">Foto URL (Opcional)</th>
                                <th className="p-2 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(editingProduct.variants || []).map((v, i) => (
                                <tr key={i} className="border-b border-slate-100 dark:border-zinc-900/50 hover:bg-slate-50/50 dark:hover:bg-zinc-900/30 text-slate-700 dark:text-zinc-300">
                                  <td className="p-2 font-mono font-bold text-indigo-500 dark:text-indigo-400">{v.size}</td>
                                  <td className="p-2 flex items-center gap-2">
                                    <span className="w-3.5 h-3.5 rounded-full border border-zinc-300 dark:border-zinc-800 shadow-sm" style={{ backgroundColor: v.colorCode || '#666' }}></span>
                                    <span>{v.color}</span>
                                  </td>
                                  <td className="p-2 font-mono">
                                    <input
                                      type="text"
                                      placeholder="Código / SKU"
                                      value={v.sku || ""}
                                      onChange={(e) => {
                                        const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                        nextArr[i].sku = e.target.value.trim().toUpperCase();
                                        setEditingProduct(updateProductCalculations({
                                          ...editingProduct,
                                          variants: nextArr
                                        }) as Product);
                                      }}
                                      className="w-44 px-2 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none uppercase text-slate-800 dark:text-zinc-100 focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={v.stockPinamar !== undefined ? v.stockPinamar : v.stock}
                                      onChange={(e) => {
                                        const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                        const sp = Math.max(0, Math.floor(Number(e.target.value || 0)));
                                        const sm = nextArr[i].stockMontevideo !== undefined ? nextArr[i].stockMontevideo : 0;
                                        nextArr[i].stockPinamar = sp;
                                        nextArr[i].stock = sp + sm;
                                        setEditingProduct(updateProductCalculations({
                                          ...editingProduct,
                                          variants: nextArr
                                        }) as Product);
                                      }}
                                      className="w-16 px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none"
                                    />
                                  </td>
                                  <td className="p-2">
                                    <input
                                      type="number"
                                      value={v.stockMontevideo !== undefined ? v.stockMontevideo : 0}
                                      onChange={(e) => {
                                        const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                        const sp = nextArr[i].stockPinamar !== undefined ? nextArr[i].stockPinamar : nextArr[i].stock;
                                        const sm = Math.max(0, Math.floor(Number(e.target.value || 0)));
                                        nextArr[i].stockMontevideo = sm;
                                        nextArr[i].stock = sp + sm;
                                        setEditingProduct(updateProductCalculations({
                                          ...editingProduct,
                                          variants: nextArr
                                        }) as Product);
                                      }}
                                      className="w-16 px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none"
                                    />
                                  </td>
                                  <td className="p-2 font-mono font-bold text-zinc-500">
                                    {v.stock}
                                  </td>
                                  <td className="p-2">
                                    <div className="flex items-center gap-1">
                                      <span className="text-zinc-400 font-bold">$</span>
                                      <input
                                        type="number"
                                        placeholder="Base"
                                        value={v.price !== undefined ? v.price : ""}
                                        onChange={(e) => {
                                          const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                          const val = e.target.value;
                                          if (val === "") {
                                            delete nextArr[i].price;
                                          } else {
                                            nextArr[i].price = Math.max(0, Number(val));
                                          }
                                          setEditingProduct({
                                            ...editingProduct,
                                            variants: nextArr
                                          });
                                        }}
                                        className="w-20 px-1 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded font-mono font-bold text-xs outline-none"
                                      />
                                    </div>
                                  </td>
                                  <td className="p-2">
                                                                        {(() => {
                                      const galleryImages = [editingProduct.imageUrl, ...(editingProduct.imagenes || [])].filter(Boolean);
                                      return (
                                        <div className="flex flex-col gap-1 max-w-[170px]">
                                          {galleryImages.length > 0 ? (
                                            <select
                                              value={galleryImages.includes(v.imageUrl || "") ? v.imageUrl : (v.imageUrl ? "manual" : "")}
                                              onChange={(e) => {
                                                const val = e.target.value;
                                                const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                                if (val === "manual") {
                                                  if (galleryImages.includes(v.imageUrl || "")) {
                                                    nextArr[i].imageUrl = "";
                                                  }
                                                } else {
                                                  nextArr[i].imageUrl = val;
                                                }
                                                setEditingProduct({
                                                  ...editingProduct,
                                                  variants: nextArr
                                                });
                                              }}
                                              className="px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-205 dark:border-zinc-800 rounded text-[11px] outline-none w-full text-slate-800 dark:text-zinc-200"
                                            >
                                              <option value="">-- Sin foto --</option>
                                              {galleryImages.map((img, imgIdx) => (
                                                <option key={imgIdx} value={img}>
                                                  {imgIdx === 0 ? "Foto Principal" : `Foto Adicional ${imgIdx}`}
                                                </option>
                                              ))}
                                              <option value="manual">Otro (Insertar URL)...</option>
                                            </select>
                                          ) : null}

                                          {(galleryImages.length === 0 || !v.imageUrl || !galleryImages.includes(v.imageUrl)) && (
                                            <div className="space-y-1">
                                              <input
                                                type="text"
                                                placeholder="URL de foto..."
                                                value={v.imageUrl || ""}
                                                onChange={(e) => {
                                                  const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                                  nextArr[i].imageUrl = e.target.value.trim();
                                                  setEditingProduct({
                                                    ...editingProduct,
                                                    variants: nextArr
                                                  });
                                                }}
                                                className="w-full px-1.5 py-0.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded text-[10px] outline-none font-mono"
                                              />
                                              <div className="flex items-center gap-1 mt-1">
                                                <span className="text-[8px] text-zinc-400 font-bold uppercase shrink-0">Subir:</span>
                                                <input
                                                  type="file"
                                                  accept="image/*"
                                                  onChange={async (e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                      const file = e.target.files[0];
                                                      const formData = new FormData();
                                                      formData.append("image", file);
                                                      try {
                                                        const uploadRes = await fetch("/api/cloudinary/upload", {
                                                          method: "POST",
                                                          headers: {
                                                            "Authorization": `Bearer ${localStorage.getItem("apex_admin_token") || ""}`
                                                          },
                                                          body: formData,
                                                        });
const resText = await uploadRes.text();
                                                        let parsedData: any = null;
                                                        
                                                        if (resText.trim().startsWith("<!doctype") || resText.trim().startsWith("<html")) {
                                                          alert("El servidor no pudo subir la imagen. Por favor, verifica que Cloudinary esté configurado en tus Ajustes o reinicia el servidor.");
                                                          return;
                                                        }
                                                        
                                                        try {
                                                          parsedData = JSON.parse(resText);
                                                        } catch (pErr) {
                                                          console.error("Error al parsear respuesta JSON:", pErr);
                                                        }

                                                        if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
                                                          const nextArr = JSON.parse(JSON.stringify(editingProduct.variants || []));
                                                          nextArr[i].imageUrl = parsedData.url;
                                                          setEditingProduct({
                                                            ...editingProduct,
                                                            variants: nextArr
                                                          });
                                                          showToast("¡Imagen de variante cargada con éxito! 🛍️", "success");
                                                        } else {
                                                          showToast((parsedData && parsedData.message) || "Error al subir a Cloudinary.", "error");
                                                        }
                                                      } catch (err) {
                                                        console.error(err);
                                                        showToast("Error al conectar con la API de subida.", "error");
                                                      }
                                                    }
                                                  }}
                                                  className="w-full text-[8px] text-zinc-500 dark:text-zinc-400 file:mr-1 file:py-0.5 file:px-1 file:rounded file:border-0 file:text-[8px] file:font-semibold file:bg-zinc-100 dark:file:bg-zinc-800 file:text-zinc-700 dark:file:text-zinc-300 hover:file:opacity-80 cursor-pointer"
                                                />
                                              </div>
                                            </div>
                                          )}

                                          {!!v.imageUrl && (
                                            <div className="flex items-center gap-1 mt-0.5 bg-slate-100/40 dark:bg-zinc-900/40 p-1 rounded border border-slate-200/50 dark:border-zinc-800/30">
                                              <img 
                                                src={v.imageUrl || null} 
                                                alt="preview" 
                                                className="w-6 h-6 object-cover rounded border border-zinc-700/20 shadow-xs shrink-0" 
                                                onError={(e) => { e.target.style.display = 'none'; }} 
                                              />
                                              <span className="text-[9px] text-zinc-500 truncate max-w-[110px]" title={v.imageUrl}>
                                                {v.imageUrl.includes('/') ? v.imageUrl.substring(v.imageUrl.lastIndexOf('/') + 1) : v.imageUrl}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="p-2 text-right">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const nextVariants = (editingProduct.variants || []).filter((_, idx) => idx !== i);
                                        setEditingProduct({
                                          ...editingProduct,
                                          variants: nextVariants,
                                          stock: nextVariants.reduce((sum, item) => sum + item.stock, 0)
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-650 font-bold transition-all cursor-pointer"
                                    >
                                      Remover
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-3 text-center text-zinc-500 text-[11px] bg-slate-100/30 dark:bg-zinc-950 rounded-lg border border-dashed border-slate-200 dark:border-zinc-800">
                          Sin combinaciones registradas. Se usará el stock físico general definido arriba. Puedes autogenerarlas o añadirlas manualmente.
                        </div>
                      )}
                    </div>
                      </>
                    )}

                    {editingProductStep === 4 && (
                      <div className="space-y-4 animate-fade-in unique-step-four">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl space-y-2 w-full">
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center justify-between">
                              <span>Stock Físico General (Pinamar + Montevideo)</span>
                            </label>
                            <div className="text-sm font-bold font-mono text-slate-800 dark:text-zinc-200">
                              {editingProduct.stock || 0} unidades disponibles
                            </div>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-sans leading-normal">
                              El stock total es calculado de forma automatizada en base a las sucursales definidas en el Paso 2 (Precios y Fotos).
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3.5 p-4 rounded-xl bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="editProductIs3D"
                              checked={!!editingProduct.is3D}
                              onChange={(e) => setEditingProduct({ ...editingProduct, is3D: e.target.checked, hoursPerUnit: e.target.checked ? (editingProduct.hoursPerUnit || 1) : undefined })}
                              className="rounded border-zinc-700 bg-zinc-950 text-indigo-500 focus:ring-0 cursor-pointer h-4 w-4"
                            />
                            <label htmlFor="editProductIs3D" className="text-xs text-zinc-700 dark:text-zinc-300 select-none cursor-pointer font-bold flex items-center gap-1.5 text-indigo-500 dark:text-indigo-400">
                              <Cpu className="w-4 h-4 shrink-0" />
                              <span>Habilitar Fabricación y Stock 3D Bajo Demanda</span>
                            </label>
                          </div>

                          {editingProduct.is3D && (
                            <div className="pl-6 animate-fade-in space-y-2">
                              <label htmlFor="editProductHours" className="block text-[10px] font-extrabold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">
                                Demora de fabricación estimada por unidad (en días):
                              </label>
                              <div className="flex items-center gap-2.5">
                                <input
                                  type="number"
                                  id="editProductHours"
                                  min="1"
                                  max="100"
                                  value={editingProduct.hoursPerUnit || 1}
                                  onChange={(e) => setEditingProduct({ ...editingProduct, hoursPerUnit: Math.max(1, Number(e.target.value)) })}
                                  className="w-24 px-2.5 py-1.5 rounded bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-800 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#5346ff]"
                                />
                                <span className="text-[11px] text-zinc-500">día(s) de demora.</span>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 dark:border-zinc-800/40">
                            <input
                              type="checkbox"
                              id="editProductConsultOnly"
                              checked={!!editingProduct.consultOnly}
                              onChange={(e) => setEditingProduct({ ...editingProduct, consultOnly: e.target.checked })}
                              className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-0 cursor-pointer h-4 w-4"
                            />
                            <label htmlFor="editProductConsultOnly" className="text-xs text-zinc-700 dark:text-zinc-300 select-none cursor-pointer font-bold flex items-center gap-1.5 text-emerald-500 dark:text-emerald-400">
                              <Phone className="w-4 h-4 shrink-0" />
                              <span>Sólo Consulta (Sustituye botón de Comprar por Consultar vía WhatsApp)</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="editProductFeatured"
                            checked={!!editingProduct.featured}
                            onChange={(e) => setEditingProduct({ ...editingProduct, featured: e.target.checked })}
                            className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 cursor-pointer h-4 w-4"
                          />
                          <label htmlFor="editProductFeatured" className="text-xs text-slate-700 dark:text-zinc-300 select-none cursor-pointer font-semibold">
                            Marcar este producto como "Destacado"
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="pt-4 flex justify-between items-center border-t border-slate-100 dark:border-zinc-800 mt-4">
                      <div className="flex gap-2">
                        {editingProductStep > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditProductErrors({});
                              setEditingProductStep((prev) => prev - 1);
                            }}
                            className="px-4 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                          >
                            ← Atrás
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(null);
                            setEditingProductStep(1);
                          }}
                          className="px-4 py-2 text-red-500 hover:text-red-650 rounded-lg text-xs font-semibold hover:bg-red-50/50 dark:hover:bg-red-950/20 transition cursor-pointer"
                        >
                          Cancelar Todo
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {editingProductStep < 4 ? (
                          <button
                            key="btn-edit-next"
                            type="button"
                            onClick={() => {
                              if (editingProductStep === 1) {
                                if (!editingProduct.name || !editingProduct.name.trim()) {
                                  setEditProductErrors({ name: "El nombre es obligatorio antes de avanzar." });
                                  return;
                                }
                                if (!editingProduct.categoria_id) {
                                  setEditProductErrors({ category: "La categoría principal es obligatoria." });
                                  return;
                                }
                              }
                              setEditProductErrors({});
                              setEditingProductStep((prev) => prev + 1);
                            }}
                            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition shadow-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span>Siguiente Paso</span>
                            <span>→</span>
                          </button>
                        ) : (
                          <button
                            key="btn-edit-submit"
                            type="button"
                            onClick={handleUpdateProduct}
                            disabled={saving}
                            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition shadow-md flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{saving ? "Guardando..." : "Guardar Modificación"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </form>
                )}

                {/* 5. CATEGORIES MANAGER */}
                {adminSection === "categories" && (
                  <div className="space-y-6">
                    {/* Category forms row */}
                    <div id="admin-categories-editor-form-row" className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Left: main category form (create or edit) */}
                      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                        {editingCategory ? (
                          <form onSubmit={handleUpdateDynamicCategory} className="space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-100/10 dark:border-zinc-900 pb-2">
                              <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500">Editar Categoría</h4>
                              <button
                                type="button"
                                onClick={() => setEditingCategory(null)}
                                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                              >
                                Cancelar edición
                              </button>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Nombre</label>
                              <input
                                required
                                type="text"
                                value={editingCategory.nombre || ""}
                                onChange={(e) => setEditingCategory({ ...editingCategory, nombre: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-semibold"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Ícono (Lucide)</label>
                                <select
                                  value={editingCategory.icono || "Shirt"}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, icono: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold"
                                >
                                  {Object.keys(ICON_LABELS).map((ico) => (
                                    <option key={ico} value={ico}>
                                      {ICON_LABELS[ico]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Orden de visualización</label>
                                <input
                                  type="number"
                                  value={editingCategory.orden === undefined ? "" : editingCategory.orden}
                                  onChange={(e) => setEditingCategory({ ...editingCategory, orden: Number(e.target.value) })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-mono"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="checkbox"
                                id="editingCategoryActive"
                                checked={editingCategory.active !== false}
                                onChange={(e) => setEditingCategory({ ...editingCategory, active: e.target.checked })}
                                className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-0 cursor-pointer h-4 w-4"
                              />
                              <label htmlFor="editingCategoryActive" className="text-xs text-zinc-300 font-semibold select-none cursor-pointer">
                                Categoría activa (se muestra en menú)
                              </label>
                            </div>
                            <button
                              type="submit"
                              disabled={saving}
                              className="w-full py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-all cursor-pointer"
                            >
                              {saving ? "Salvando..." : "Guardar Cambios"}
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleAddCategory} className="space-y-3">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-400 border-b border-zinc-100/5 pb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-3 bg-blue-500 rounded-full"></span>
                              <span>Crear Categoría Principal</span>
                            </h4>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Nombre de Categoría *</label>
                              <input
                                required
                                type="text"
                                placeholder="p.ej. Accesorios premium"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Ícono</label>
                                <select
                                  value={newCategoryIcon}
                                  onChange={(e) => setNewCategoryIcon(e.target.value)}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold"
                                >
                                  {Object.keys(ICON_LABELS).map((ico) => (
                                    <option key={ico} value={ico}>
                                      {ICON_LABELS[ico]}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Orden</label>
                                <input
                                  type="number"
                                  value={newCategoryOrder}
                                  onChange={(e) => setNewCategoryOrder(Number(e.target.value))}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-mono"
                                />
                              </div>
                            </div>
                            <button
                              type="submit"
                              disabled={saving}
                              className="w-full py-2 bg-blue-600 text-white font-semibold rounded-lg text-xs hover:bg-blue-700 transition flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Crear Categoría</span>
                            </button>
                          </form>
                        )}
                      </div>

                      {/* Right: subcategory form (create or edit) */}
                      <div className="bg-white dark:bg-zinc-950 p-5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                        {editingSubcategory ? (
                          <form onSubmit={handleUpdateSubcategory} className="space-y-3">
                            <div className="flex items-center justify-between border-b border-zinc-100/10 dark:border-zinc-900 pb-2">
                              <h4 className="font-bold text-xs uppercase tracking-wider text-indigo-400">Editar Subcategoría</h4>
                              <button
                                type="button"
                                onClick={() => setEditingSubcategory(null)}
                                className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                              >
                                Cancelar edición
                              </button>
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Nombre</label>
                              <input
                                required
                                type="text"
                                value={editingSubcategory.nombre || ""}
                                onChange={(e) => setEditingSubcategory({ ...editingSubcategory, nombre: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-semibold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Categoría Principal Asignada</label>
                              <select
                                value={editingSubcategory.categoria_id || ""}
                                onChange={(e) => setEditingSubcategory({ ...editingSubcategory, categoria_id: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-bold"
                              >
                                {(store.dbCategories || []).map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={saving}
                              className="w-full py-2 bg-indigo-650 bg-indigo-650 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition shadow cursor-pointer text-center"
                            >
                              {saving ? "Salvando..." : "Guardar Modificaciones"}
                            </button>
                          </form>
                        ) : (
                          <form onSubmit={handleCreateSubcategory} className="space-y-3">
                            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-zinc-400 border-b border-zinc-100/5 pb-2 flex items-center gap-1.5">
                              <span className="w-1.5 h-3 bg-violet-500 rounded-full"></span>
                              <span>Crear Nueva Subcategoría</span>
                            </h4>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Nombre de Subcategoría *</label>
                              <input
                                required
                                type="text"
                                placeholder="p.ej. Zapatos de vestir"
                                value={newSubcategoryName}
                                onChange={(e) => setNewSubcategoryName(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">Categoría Principal Madre</label>
                              <select
                                value={newSubcategoryParent}
                                onChange={(e) => setNewSubcategoryParent(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white font-semibold"
                              >
                                <option value="">-- Elige categoría madre --</option>
                                {(store.dbCategories || []).map((cat) => (
                                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="submit"
                              disabled={saving || !newSubcategoryParent}
                              className="w-full py-2 bg-violet-600 disabled:opacity-40 text-white font-semibold rounded-lg text-xs hover:bg-violet-700 transition flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Crear Subcategoría</span>
                            </button>
                          </form>
                        )}
                      </div>
                    </div>

                    {/* Listing of all categories and nested subcategories */}
                    <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/80 flex items-center justify-between">
                        <div>
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-300">
                            Jerarquía de Categorías y Subcategorías
                          </h4>
                          <p className="text-[10px] text-zinc-400 mt-0.5">Organiza tu menú y segmenta tus productos sin tocar código.</p>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-bold">
                          {(store.dbCategories || []).length} principales | {(store.dbSubcategories || []).length} secundarias
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                        {(store.dbCategories || []).length === 0 ? (
                          <div className="p-8 text-center text-zinc-500 text-xs">
                            No hay categorías principales creadas aún. Utiliza el formulario superior para crear la primera.
                          </div>
                        ) : (
                          (store.dbCategories || [])
                            .sort((a,b) => (a.orden || 0)  - (b.orden || 0))
                            .map((cat) => {
                              const catProductsCount = store.products.filter(p => p.categoria_id === cat.id || p.category?.toLowerCase() === cat.nombre?.toLowerCase()).length;
                              const children = (store.dbSubcategories || []).filter(s => s.categoria_id === cat.id);
                              
                              return (
                                <div key={cat.id} className="p-5 flex flex-col gap-3 hover:bg-slate-50/40 dark:hover:bg-zinc-900/10 transition">
                                  {/* Main Category Header details */}
                                  <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="text-[10px] font-bold bg-zinc-800 text-indigo-400 px-2 py-0.5 rounded font-mono" title="Orden de visualización">
                                        N° {cat.orden || 0}
                                      </div>
                                      <span className="p-1.5 bg-zinc-800/80 text-zinc-300 rounded flex items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
                                        {getCategoryIcon(cat.icono || cat.nombre)}
                                      </span>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{cat.nombre}</span>
                                          {cat.active === false ? (
                                            <span className="text-[9px] bg-amber-500/10 text-amber-500 dark:text-amber-400 px-1.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                              <span>👁</span> Oculta en Web
                                            </span>
                                          ) : (
                                            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                                              <span>✨</span> Visible en Web
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">
                                          {catProductsCount} {catProductsCount === 1 ? "producto asignado" : "productos asignados"}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action items */}
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        onClick={() => {
                                          const nextActiveStatus = cat.active === false ? true : false;
                                          const updatedDbCategories = (store.dbCategories || []).map(c => {
                                            if (c.id === cat.id) return { ...c, active: nextActiveStatus };
                                            return c;
                                          });
                                          saveStateToServer({ ...store, dbCategories: updatedDbCategories });
                                        }}
                                        className={`text-[10.5px] font-bold py-1 px-2.5 rounded-lg border transition cursor-pointer ${
                                          cat.active === false
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                            : "border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                        }`}
                                      >
                                        {cat.active === false ? "Mostrar en Web" : "Ocultar de Web"}
                                      </button>
                                      
                                      <button
                                        onClick={() => handleStartEditCategory(cat)}
                                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition cursor-pointer"
                                        title="Editar Categoría"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      
                                      <button
                                        onClick={() => handleDeleteCategory(cat.id)}
                                        className="p-1.5 rounded bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition cursor-pointer"
                                        title="Eliminar Categoría"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subcategories list box inside parent Category */}
                                  <div className="pl-6 border-l border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 mt-1">
                                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Subcategorías Relacionadas</span>
                                    
                                    {children.length === 0 ? (
                                      <p className="text-[10px] text-zinc-500 italic">No hay subcategorías asignadas.</p>
                                    ) : (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                        {children.map((sub) => {
                                          const subProductsCount = store.products.filter(p => p.subcategoria_id === sub.id).length;
                                          return (
                                            <div key={sub.id} className="p-2.5 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-100 dark:border-zinc-800/40 flex items-center justify-between">
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <p className="text-xs font-semibold truncate text-slate-900 dark:text-zinc-300">{sub.nombre}</p>
                                                  {sub.active === false ? (
                                                    <span className="text-[7.5px] bg-amber-500/10 text-amber-500 px-1 py-0.2 rounded font-bold uppercase tracking-wider font-mono">Oculta</span>
                                                  ) : (
                                                    <span className="text-[7.5px] bg-emerald-500/10 text-emerald-400 px-1 py-0.2 rounded font-bold uppercase tracking-wider font-mono">Visible</span>
                                                  )}
                                                </div>
                                                <span className="text-[9px] text-zinc-500">
                                                  {subProductsCount} {subProductsCount === 1 ? "producto" : "productos"}
                                                </span>
                                              </div>
                                              
                                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                                <button
                                                  onClick={() => {
                                                    const nextActiveStatus = sub.active === false ? true : false;
                                                    const updatedDbSubcategories = (store.dbSubcategories || []).map(s => {
                                                      if (s.id === sub.id) return { ...s, active: nextActiveStatus };
                                                      return s;
                                                    });
                                                    saveStateToServer({ ...store, dbSubcategories: updatedDbSubcategories });
                                                  }}
                                                  className={`px-1.5 py-0.5 rounded text-[9px] transition cursor-pointer font-bold ${
                                                    sub.active === false 
                                                      ? "bg-amber-500/10 hover:bg-amber-500 hover:text-white text-amber-500 border border-amber-500/20" 
                                                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                                                  }`}
                                                  title={sub.active === false ? "Mostrar en Web" : "Ocultar en Web"}
                                                >
                                                  {sub.active === false ? "Mostrar" : "Ocultar"}
                                                </button>
                                                <button
                                                  onClick={() => handleStartEditSubcategory(sub)}
                                                  className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all text-[10px] cursor-pointer"
                                                  title="Renombrar / Mover"
                                                >
                                                  <Edit className="h-3 w-3" />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteSubcategory(sub.id)}
                                                  className="p-1 rounded bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all text-[10px] cursor-pointer"
                                                  title="Eliminar Subcategoría"
                                                >
                                                  <Trash2 className="h-3 w-3" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. PROMOTIONS AND DISCOUNTS PAGE */}
                {adminSection === "promos" && (
                  <div className="space-y-4">
                    {/* General Promotion banner config */}
                    <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                        <Tag className="h-4 w-4 text-amber-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Conf. de Cintillo de Descuento (Barra Superior)</h3>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs leading-relaxed">
                        <div>
                          <strong>¿Cómo funciona el slider superior?</strong> Los cintillos activos se alternan automáticamente cada 5 segundos en la parte superior del eCommerce, informando a los clientes sobre cupones de descuento y envíos sin costo.
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Activar Cintillo de Promoción General</span>
                            <span className="text-[10px] text-zinc-400">Habilita un mensaje flotante con texto personalizado o cupones de tu elección.</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              showPromotionBanner: editingSettings.showPromotionBanner === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.showPromotionBanner !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.showPromotionBanner !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.showPromotionBanner !== false && (
                          <div className="space-y-4 animate-fade-in border-t border-slate-100 dark:border-zinc-800/60 pt-4 mt-2">
                            <div className="space-y-2">
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Texto de Ofertas 1 (Mensaje Principal)</label>
                              <input
                                type="text"
                                value={editingSettings.promotionBannerText || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerText: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                placeholder="p.ej. 🚚 ¡15% de DESCUENTO en toda la tienda! Código: BUELO15"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Texto de Ofertas 2 (Mensaje Secundario de Rotación)</label>
                              <input
                                type="text"
                                value={editingSettings.promotionBannerText2 || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerText2: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                                placeholder="p.ej. 🎁 ¡Envío GRATIS en compras mayores de $2000! Elige tu de agencia favorita y nosotros lo cubrimos."
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Color de Fondo</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={editingSettings.promotionBannerBgColor || "#4f46e5"}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerBgColor: e.target.value })}
                                    className="w-10 h-8 p-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={editingSettings.promotionBannerBgColor || "#4f46e5"}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerBgColor: e.target.value })}
                                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white"
                                    placeholder="#4f46e5"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Color de Texto</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="color"
                                    value={editingSettings.promotionBannerTextColor || "#ffffff"}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerTextColor: e.target.value })}
                                    className="w-10 h-8 p-1 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg cursor-pointer"
                                  />
                                  <input
                                    type="text"
                                    value={editingSettings.promotionBannerTextColor || "#ffffff"}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerTextColor: e.target.value })}
                                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white"
                                    placeholder="#ffffff"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Efecto de Transición</label>
                                <select
                                  value={editingSettings.promotionBannerTransition || 'slide'}
                                  onChange={(e) => setEditingSettings({ ...editingSettings, promotionBannerTransition: e.target.value as any })}
                                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none text-slate-900 dark:text-white"
                                >
                                  <option value="slide">Deslizar verticalmente (Slide)</option>
                                  <option value="fade">Desvanecimiento (Fade)</option>
                                  <option value="zoom">Efecto Escala / Zoom (Zoom)</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Free shipping banner config */}
                    <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                      <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                        <Truck className="h-4 w-4 text-emerald-500" />
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Conf. de Cintillo de Envío Gratis por Zonas</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-800 dark:text-zinc-200">Activar Cintillo y Lógica de Envío Gratis</span>
                            <span className="text-[10px] text-zinc-400">Calcula y aplica automáticamente el beneficio si la localidad califica al superar el monto mínimo.</span>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              freeShippingActive: editingSettings.freeShippingActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.freeShippingActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.freeShippingActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.freeShippingActive !== false && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in pt-2 border-t border-slate-100 dark:border-zinc-800/60 font-sans">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Monto de Compra Mínimo ($)</label>
                              <input
                                type="number"
                                value={editingSettings.freeShippingMinAmount !== undefined ? editingSettings.freeShippingMinAmount : 2000}
                                onChange={(e) => setEditingSettings({ ...editingSettings, freeShippingMinAmount: Number(e.target.value) })}
                                placeholder="Ej: 2000"
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Zonas/Localidades con Envío Gratis (Separadas por comas)</label>
                              <input
                                type="text"
                                value={editingSettings.freeShippingRegions || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, freeShippingRegions: e.target.value })}
                                placeholder="Ej: Pinamar, Salinas, Marindia, Neptunia"
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-tight">Cualquier compra con localidad que figure en esta lista recibirá Envío Gratis si supera el monto.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 flex justify-end border-t border-slate-100 dark:border-zinc-800">
                        <button
                          onClick={handleSaveSettings}
                          disabled={saving}
                          className="py-2.5 px-6 bg-blue-600 text-white rounded-lg font-semibold text-xs transition-all hover:bg-blue-700 hover:scale-[1.01] cursor-pointer"
                        >
                          <span>{saving ? "Salvando..." : "Guardar Configuraciones de Cintillo"}</span>
                        </button>
                      </div>
                    </div>

                  {/* Dynamic coupon CRUD card */}
                  <div className="bg-white dark:bg-zinc-950 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800/10 dark:border-zinc-800 pb-3 mb-2">
                      <Percent className="h-4 w-4 text-emerald-500" />
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white">Crear y Gestionar Cupones de Descuento</h3>
                    </div>

                    <form onSubmit={handleAddCoupon} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end bg-slate-50 dark:bg-zinc-905/30 p-4 rounded-xl border border-slate-100 dark:border-zinc-800/40">
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Código Único (PK/Code)</label>
                          <button
                            type="button"
                            onClick={handleGenerateRandomCouponCode}
                            className="text-[9px] font-bold text-indigo-500 hover:text-indigo-600 bg-indigo-500/15 hover:bg-indigo-500/25 px-2 py-0.5 rounded transition cursor-pointer select-none"
                            title="Generar Código Aleatorio"
                          >
                            ⚡ Auto Generar
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          placeholder="Ej. MASFAST15"
                          value={newCouponCode}
                          onChange={(e) => setNewCouponCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white uppercase font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">% Descuento Directo</label>
                        <input
                          type="number"
                          required
                          min="1"
                          max="100"
                          placeholder="p.ej. 15"
                          value={newCouponDiscount}
                          onChange={(e) => setNewCouponDiscount(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Fecha de Vencimiento</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newCouponExpiration}
                            onChange={(e) => setNewCouponExpiration(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white cursor-pointer"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
                          >
                            Agregar
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Coupons List */}
                    <div className="space-y-2 mt-4">
                      <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">Cupones Activos Registrados en Base de Datos</label>
                      {!(store.coupons && store.coupons.length > 0) ? (
                        <p className="text-xs text-zinc-500 italic mt-1 bg-slate-50 dark:bg-zinc-900/50 p-3 rounded-lg border border-dashed border-zinc-800">
                          No hay cupones personalizados en la base de datos de Ventas Juem todavía. Puedes crear uno arriba y se validará en vivo en el carrito.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                          {store.coupons.map((c) => {
                            const isExpired = c.expiration_date ? new Date(c.expiration_date).getTime() < Date.now() : false;
                            return (
                              <div key={c.code} className="p-3 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-mono font-black text-indigo-400 uppercase tracking-wide bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                                      {c.code}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-400">
                                      {c.discount_percent}% OFF
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-zinc-400 mt-1">
                                    {c.expiration_date ? (
                                      <span className={isExpired ? "text-red-400 line-through font-semibold" : "text-zinc-400"}>
                                        Vence: {new Date(c.expiration_date).toLocaleDateString()} {isExpired && " (Expirado)"}
                                      </span>
                                    ) : (
                                      <span>Sin límite de vencimiento</span>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteCoupon(c.code)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 transition cursor-pointer"
                                  title="Eliminar Cupón"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

                {/* 9. GESTION DE STOCK GENERAL (DEPOSITO MONTEVIDEO Y PINAMAR) */}
                {adminSection === "stock" && (() => {
                  const stockItems = (() => {
                    const list: any[] = [];
                    (store.products || []).filter(p => p.active !== false).forEach(product => {
                      const hasVariants = product.variants && product.variants.length > 0;
                      if (hasVariants) {
                        product.variants!.forEach(variant => {
                          list.push({
                            id: `${product.id}-${variant.id || variant.sku}`,
                            productId: product.id,
                            variantId: variant.id,
                            sku: variant.sku || product.codigo || "SIN-SKU",
                            name: product.name,
                            variantName: `${variant.size} / ${variant.color}`,
                            imageUrl: variant.imageUrl || product.imageUrl,
                            precioCompra: product.precioCompra || 0,
                            price: variant.price || product.price,
                            precioVentaML: product.precioVentaML || 0,
                            comisionML: product.comisionML || 0,
                            stockMontevideo: variant.stockMontevideo || 0,
                            stockPinamar: variant.stockPinamar || 0,
                            isVariant: true,
                            variantObj: variant,
                            productObj: product
                          });
                        });
                      } else {
                        list.push({
                          id: product.id,
                          productId: product.id,
                          variantId: undefined,
                          sku: product.codigo || "SIN-SKU",
                          name: product.name,
                          variantName: "",
                          imageUrl: product.imageUrl,
                          precioCompra: product.precioCompra || 0,
                          price: product.price,
                          precioVentaML: product.precioVentaML || 0,
                          comisionML: product.comisionML || 0,
                          stockMontevideo: product.stockMontevideo || 0,
                          stockPinamar: product.stockPinamar || 0,
                          isVariant: false,
                          variantObj: undefined,
                          productObj: product
                        });
                      }
                    });
                    return list;
                  })();

                  const filteredStockItems = stockItems.filter(item => {
                    // Global search query
                    const query = stockSearchQuery.toLowerCase().trim();
                    if (query) {
                      const matchGlobal = (
                        item.sku.toLowerCase().includes(query) ||
                        item.name.toLowerCase().includes(query) ||
                        item.variantName.toLowerCase().includes(query)
                      );
                      if (!matchGlobal) return false;
                    }

                    // Column SKU Filter
                    if (stockSkuFilter) {
                      if (!item.sku.toLowerCase().includes(stockSkuFilter.toLowerCase().trim())) {
                        return false;
                      }
                    }

                    // Column Name Filter
                    if (stockNameFilter) {
                      const fullItemName = `${item.name} ${item.variantName}`.toLowerCase();
                      if (!fullItemName.includes(stockNameFilter.toLowerCase().trim())) {
                        return false;
                      }
                    }

                    // Column Cost Filter
                    if (stockCostFilter !== "all") {
                      if (stockCostFilter === "hasCost" && (!item.precioCompra || item.precioCompra <= 0)) return false;
                      if (stockCostFilter === "noCost" && item.precioCompra > 0) return false;
                    }

                    // Column Local Price Filter
                    if (stockLocalFilter !== "all") {
                      if (stockLocalFilter === "hasPrice" && (!item.price || item.price <= 0)) return false;
                      if (stockLocalFilter === "noPrice" && item.price > 0) return false;
                    }

                    // Column ML Price Filter
                    if (stockMlFilter !== "all") {
                      if (stockMlFilter === "hasPriceML" && (!item.precioVentaML || item.precioVentaML <= 0)) return false;
                      if (stockMlFilter === "noPriceML" && item.precioVentaML > 0) return false;
                    }

                    // Column MVD Stock Filter
                    if (stockMvdFilter !== "all") {
                      const mvdLow = typeof store.settings?.lowStockThreshold === 'number' ? store.settings.lowStockThreshold : 5;
                      if (stockMvdFilter === "out" && item.stockMontevideo > 0) return false;
                      if (stockMvdFilter === "low" && (item.stockMontevideo <= 0 || item.stockMontevideo > mvdLow)) return false;
                      if (stockMvdFilter === "ok" && item.stockMontevideo <= mvdLow) return false;
                    }

                    // Column PIN Stock Filter
                    if (stockPinFilter !== "all") {
                      const pinLow = typeof store.settings?.lowStockThreshold === 'number' ? store.settings.lowStockThreshold : 5;
                      if (stockPinFilter === "out" && item.stockPinamar > 0) return false;
                      if (stockPinFilter === "low" && (item.stockPinamar <= 0 || item.stockPinamar > pinLow)) return false;
                      if (stockPinFilter === "ok" && item.stockPinamar <= pinLow) return false;
                    }

                    return true;
                  });

                  // Sort items if sortField is selected
                  const sortedStockItems = [...filteredStockItems];
                  if (sortField) {
                    sortedStockItems.sort((a, b) => {
                      let valA: any = "";
                      let valB: any = "";
                      
                      switch (sortField) {
                        case "codigo":
                          valA = (a.sku || "").toLowerCase();
                          valB = (b.sku || "").toLowerCase();
                          break;
                        case "nombre":
                          valA = `${a.name} ${a.variantName}`.toLowerCase();
                          valB = `${b.name} ${b.variantName}`.toLowerCase();
                          break;
                        case "costo":
                          valA = a.precioCompra || 0;
                          valB = b.precioCompra || 0;
                          break;
                        case "precio_venta":
                          valA = a.price || 0;
                          valB = b.price || 0;
                          break;
                        case "precio_venta_ml":
                          valA = a.precioVentaML || 0;
                          valB = b.precioVentaML || 0;
                          break;
                        case "comision_ml":
                          valA = a.comisionML || 0;
                          valB = b.comisionML || 0;
                          break;
                        case "mvd_stock":
                          valA = a.stockMontevideo || 0;
                          valB = b.stockMontevideo || 0;
                          break;
                        case "pin_stock":
                          valA = a.stockPinamar || 0;
                          valB = b.stockPinamar || 0;
                          break;
                        default:
                          break;
                      }

                      if (typeof valA === "string" && typeof valB === "string") {
                        return sortDirection === "asc"
                          ? valA.localeCompare(valB)
                          : valB.localeCompare(valA);
                      } else {
                        return sortDirection === "asc"
                          ? Number(valA) - Number(valB)
                          : Number(valB) - Number(valA);
                      }
                    });
                  }

                  // Pagination mathematics
                  const itemsPerPage = 10;
                  const totalPages = Math.ceil(sortedStockItems.length / itemsPerPage) || 1;
                  const safePage = Math.min(stockPage, totalPages);
                  const startIndex = (safePage - 1) * itemsPerPage;
                  const paginatedItems = sortedStockItems.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <div className="space-y-6">
                      {/* HEADER EXCLUSIVO PARA STOCK GENERAL */}
                      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-zinc-800">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold font-sans tracking-tight text-slate-900 dark:text-white">
                              Panel de Control Administrativo
                            </h1>
                            <span className="px-2 py-0.5 text-[11px] font-extrabold uppercase bg-indigo-600 text-white rounded-full tracking-wider shadow-xs">
                              v3.5 Live
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-zinc-400 text-xs mt-1 font-semibold">
                            Sincronización multi-depósito de existencias Montevideo / Pinamar
                          </p>
                        </div>

                        {/* Controles de la derecha */}
                        <div className="flex items-center gap-2 self-stretch xl:self-auto justify-end">
                          <div className="relative flex-1 sm:flex-initial">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <input
                              type="text"
                              placeholder="Buscar artículo, SKU..."
                              value={stockSearchQuery}
                              onChange={(e) => {
                                setStockSearchQuery(e.target.value);
                                setStockPage(1);
                              }}
                              className="w-full sm:w-64 pl-9 pr-4 py-2 text-xs bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-900 dark:text-white"
                            />
                          </div>

                          <button
                            onClick={async () => {
                              showToast("Actualizando existencias...", "info");
                              try {
                                const res = await fetch("/api/store");
                                if (res.ok) {
                                  const data = await res.json();
                                  setStore(data);
                                  showToast("¡Existencias actualizadas en tiempo real!", "success");
                                }
                              } catch (err) {
                                showToast("Error al conectar con la base de datos", "error");
                              }
                            }}
                            className="p-2.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-900 transition text-zinc-600 dark:text-zinc-400 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            title="Actualizar existencias"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => {
                              setShowAIAssistantSidebar(!showAIAssistantSidebar);
                              showToast(!showAIAssistantSidebar ? "Abriendo Asistente de IA..." : "Cerrando Asistente de IA...", "info");
                            }}
                            className={`px-4 py-2 rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition flex items-center gap-1.5 text-xs shadow-sm cursor-pointer ${
                              showAIAssistantSidebar
                                ? "bg-indigo-650 text-white"
                                : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                            }`}
                          >
                            <Sparkles className={`h-4 w-4 ${showAIAssistantSidebar ? "text-white animate-pulse" : "text-amber-500"}`} />
                            <span>{showAIAssistantSidebar ? "Cerrar Copilot" : "Asistente IA"}</span>
                          </button>
                        </div>
                      </div>

                      {/* TABLA PRINCIPAL DE INVENTARIO */}
                      <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950/50">
                          <div className="flex items-center gap-2.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            <h3 className="font-extrabold text-xs uppercase text-slate-900 dark:text-zinc-200 tracking-wider">
                              INVENTARIO CENTRAL RESUMIDO
                            </h3>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-200 dark:bg-zinc-850 text-slate-700 dark:text-zinc-300 rounded-full font-mono">
                              {filteredStockItems.length} items listados
                            </span>
                          </div>
                        </div>

                        {/* Spreadsheet Table Container */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 shadow-sm">
                              <tr className="bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-wider select-none">
                                
                                {/* Columna 1: SKU / Imagen (Ancho fijo de 36, alineación izquierda) */}
                                <th 
                                  onClick={() => toggleSort('codigo')}
                                  className="py-3 px-5 text-left w-36 bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por SKU"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>SKU / Imagen</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'codigo' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 2: Producto (Nombre, ocupa el espacio restante) */}
                                <th 
                                  onClick={() => toggleSort('nombre')}
                                  className="py-3 px-4 bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Nombre"
                                >
                                  <div className="flex items-center gap-1">
                                    <span>Producto</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'nombre' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 3: Compra / Costo (Alineado a la derecha) */}
                                <th 
                                  onClick={() => toggleSort('costo')}
                                  className="py-3 px-4 text-right bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Costo de Compra"
                                >
                                  <div className="inline-flex items-center justify-end gap-1 w-full">
                                    <span>Compra (Costo)</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'costo' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 4: Venta Local (Alineado a la derecha) */}
                                <th 
                                  onClick={() => toggleSort('precio_venta')}
                                  className="py-3 px-4 text-right bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Venta Local"
                                >
                                  <div className="inline-flex items-center justify-end gap-1 w-full">
                                    <span>Venta Local</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'precio_venta' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 5: Venta MercadoLibre (Alineado a la derecha) */}
                                <th 
                                  onClick={() => toggleSort('precio_venta_ml')}
                                  className="py-3 px-4 text-right bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Venta ML"
                                >
                                  <div className="inline-flex items-center justify-end gap-1 w-full">
                                    <span>Venta ML</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'precio_venta_ml' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 6: Comisión MercadoLibre (Alineado a la derecha) */}
                                <th 
                                  onClick={() => toggleSort('comision_ml')}
                                  className="py-3 px-4 text-right bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Comisión ML"
                                >
                                  <div className="inline-flex items-center justify-end gap-1 w-full">
                                    <span>Comisión ML</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'comision_ml' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 7: Stock Montevideo (Centrado) */}
                                <th 
                                  onClick={() => toggleSort('mvd_stock')}
                                  className="py-3 px-4 text-center text-slate-550 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Stock Montevideo"
                                >
                                  <div className="inline-flex items-center justify-center gap-1 w-full">
                                    <span>Stock Mvd</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'mvd_stock' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                                {/* Columna 8: Stock Pinamar (Centrado) */}
                                <th 
                                  onClick={() => toggleSort('pin_stock')}
                                  className="py-3 px-4 text-center text-slate-550 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 sticky top-0 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all group"
                                  title="Ordenar por Stock Pinar"
                                >
                                  <div className="inline-flex items-center justify-center gap-1 w-full">
                                    <span>Stock Pin</span>
                                    <span className="text-[9px] text-indigo-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-bold transition-transform">
                                      {sortField === 'pin_stock' ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                                    </span>
                                  </div>
                                </th>

                              </tr>

                              {/* Fila de Filtros en el thead */}
                              <tr className="bg-slate-50/50 dark:bg-zinc-900/50 border-b border-slate-200 dark:border-zinc-800">
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    placeholder="Filtrar SKU..."
                                    value={stockSkuFilter}
                                    onChange={(e) => {
                                      setStockSkuFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full px-2 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-800 dark:text-white placeholder-slate-400 font-mono normal-case"
                                  />
                                </td>
                                <td className="py-2 px-4">
                                  <input
                                    type="text"
                                    placeholder="Filtrar nombre..."
                                    value={stockNameFilter}
                                    onChange={(e) => {
                                      setStockNameFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full px-2 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-800 dark:text-white placeholder-slate-400 normal-case"
                                  />
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <select
                                    value={stockCostFilter}
                                    onChange={(e) => {
                                      setStockCostFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full min-w-[70px] max-w-[90px] ml-auto px-1 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-700 dark:text-zinc-300 normal-case"
                                  >
                                    <option value="all">Todos</option>
                                    <option value="hasCost">Con Costo</option>
                                    <option value="noCost">Sin Costo</option>
                                  </select>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <select
                                    value={stockLocalFilter}
                                    onChange={(e) => {
                                      setStockLocalFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full min-w-[70px] max-w-[90px] ml-auto px-1 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-700 dark:text-zinc-300 normal-case"
                                  >
                                    <option value="all">Todos</option>
                                    <option value="hasPrice">Con Precio</option>
                                    <option value="noPrice">Sin Precio</option>
                                  </select>
                                </td>
                                <td className="py-2 px-4 text-right">
                                  <select
                                    value={stockMlFilter}
                                    onChange={(e) => {
                                      setStockMlFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full min-w-[70px] max-w-[90px] ml-auto px-1 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-700 dark:text-zinc-300 normal-case"
                                  >
                                    <option value="all">Todos</option>
                                    <option value="hasPriceML">Con Precio</option>
                                    <option value="noPriceML">Sin Precio</option>
                                  </select>
                                </td>
                                <td className="py-2 px-4 text-right text-[10px] text-zinc-400 font-mono">
                                  -
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <select
                                    value={stockMvdFilter}
                                    onChange={(e) => {
                                      setStockMvdFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full min-w-[80px] max-w-[100px] mx-auto px-1 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-700 dark:text-zinc-300 normal-case"
                                  >
                                    <option value="all">Todos</option>
                                    <option value="out">Sin Stock</option>
                                    <option value="low">Stock Bajo</option>
                                    <option value="ok">Saludable</option>
                                  </select>
                                </td>
                                <td className="py-2 px-4 text-center">
                                  <select
                                    value={stockPinFilter}
                                    onChange={(e) => {
                                      setStockPinFilter(e.target.value);
                                      setStockPage(1);
                                    }}
                                    className="w-full min-w-[80px] max-w-[100px] mx-auto px-1 py-1 text-[10px] font-semibold bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-md focus:outline-hidden text-slate-700 dark:text-zinc-300 normal-case"
                                  >
                                    <option value="all">Todos</option>
                                    <option value="out">Sin Stock</option>
                                    <option value="low">Stock Bajo</option>
                                    <option value="ok">Saludable</option>
                                  </select>
                                </td>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-150 dark:divide-zinc-850">
                              {paginatedItems.length === 0 ? (
                                <tr>
                                  <td colSpan={8} className="p-8 text-center text-zinc-500 text-xs">
                                    Ningún artículo coincide con tu búsqueda actual o filtros.
                                  </td>
                                </tr>
                              ) : (
                                paginatedItems.map((item) => {
                                  return (
                                    <tr
                                      key={item.id}
                                      className="hover:bg-slate-50/80 dark:hover:bg-zinc-900/30 transition text-xs group"
                                    >
                                      {/* SKU / IMAGEN */}
                                      <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                          <img
                                            src={item.imageUrl || "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=100&q=80"}
                                            alt={item.sku}
                                            className="h-7 w-7 rounded-md object-cover bg-zinc-800 shrink-0 border border-slate-250 dark:border-zinc-800"
                                          />
                                          <span className="font-mono text-[11px] font-bold tracking-tight text-indigo-600 dark:text-indigo-400 truncate max-w-[100px]" title={item.sku}>
                                            {item.sku}
                                          </span>
                                        </div>
                                      </td>

                                      {/* PRODUCTO */}
                                      <td className="py-3 px-4 min-w-[200px]">
                                        <div className="flex flex-col">
                                          <span className="font-bold text-slate-800 dark:text-zinc-200 line-clamp-1 leading-snug">
                                            {item.name}
                                          </span>
                                          {item.isVariant && (
                                            <span className="text-[10px] font-extrabold font-mono mt-0.5 tracking-wide bg-indigo-550/5 dark:bg-indigo-450/5 text-indigo-500 py-0.5 px-1.5 rounded-sm self-start">
                                              Variante: {item.variantName}
                                            </span>
                                          )}
                                        </div>
                                      </td>

                                      {/* COMPRA (COSTO) */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-0.5 font-mono">
                                          <span className="text-zinc-400 font-bold">$</span>
                                          <input
                                            type="number"
                                            defaultValue={item.precioCompra}
                                            onBlur={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              if (val !== item.precioCompra) {
                                                handleUpdateStockItem(item, "precioCompra", val);
                                                showToast(`Costo de ${item.sku} actualizado a $${val}`, "success");
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                (e.target as HTMLInputElement).blur();
                                              }
                                            }}
                                            className="w-16 text-right bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 px-1 py-0.5 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700 dark:text-zinc-200 outline-hidden transition"
                                          />
                                        </div>
                                      </td>

                                      {/* VENTA LOCAL */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-0.5 font-mono">
                                          <span className="text-zinc-400 font-bold">$</span>
                                          <input
                                            type="number"
                                            defaultValue={item.price}
                                            onBlur={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              if (val !== item.price) {
                                                handleUpdateStockItem(item, "price", val);
                                                showToast(`Venta Local de ${item.sku} actualizada a $${val}`, "success");
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                (e.target as HTMLInputElement).blur();
                                              }
                                            }}
                                            className="w-16 text-right bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 px-1 py-0.5 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 font-bold text-indigo-600 dark:text-indigo-400 outline-hidden transition"
                                          />
                                        </div>
                                      </td>

                                      {/* VENTA ML */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex items-center justify-end gap-0.5 font-mono">
                                          <span className="text-zinc-400 font-bold">$</span>
                                          <input
                                            type="number"
                                            defaultValue={item.precioVentaML}
                                            onBlur={(e) => {
                                              const val = parseFloat(e.target.value) || 0;
                                              if (val !== item.precioVentaML) {
                                                handleUpdateStockItem(item, "precioVentaML", val);
                                                showToast(`Precio ML de ${item.sku} actualizado a $${val}`, "success");
                                              }
                                            }}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                (e.target as HTMLInputElement).blur();
                                              }
                                            }}
                                            className="w-16 text-right bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 px-1 py-0.5 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700 dark:text-zinc-200 outline-hidden transition"
                                          />
                                        </div>
                                      </td>

                                      {/* COMISIÓN ML */}
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex flex-col items-end">
                                          <div className="flex items-center justify-end gap-0.5 font-mono">
                                            <span className="text-zinc-400 font-bold">$</span>
                                            <input
                                              type="number"
                                              defaultValue={item.comisionML}
                                              onBlur={(e) => {
                                                const val = parseFloat(e.target.value) || 0;
                                                if (val !== item.comisionML) {
                                                  handleUpdateStockItem(item, "comisionML", val);
                                                  showToast(`Comisión ML de ${item.sku} actualizada a $${val}`, "success");
                                                }
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                  (e.target as HTMLInputElement).blur();
                                                }
                                              }}
                                              className="w-16 text-right bg-transparent hover:bg-slate-100 dark:hover:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-950 px-1 py-0.5 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 font-bold text-slate-700 dark:text-zinc-200 outline-hidden transition"
                                            />
                                          </div>
                                          <span className="text-[8px] font-extrabold uppercase tracking-widest text-zinc-400 font-sans mr-2 select-none">
                                            FIJO
                                          </span>
                                        </div>
                                      </td>

                                      {/* STOCK MVD */}
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 font-mono">
                                          <button
                                            onClick={() => {
                                              const nextVal = Math.max(0, item.stockMontevideo - 1);
                                              handleUpdateStockItem(item, "stockMontevideo", nextVal);
                                              showToast(`MVD de ${item.sku}: ${nextVal}u`, "success");
                                            }}
                                            className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800 text-zinc-500 hover:bg-red-500 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Descontar 1 unidad"
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            value={item.stockMontevideo}
                                            onChange={(e) => {
                                              const val = Math.max(0, parseInt(e.target.value) || 0);
                                              handleUpdateStockItem(item, "stockMontevideo", val);
                                            }}
                                            className={`w-12 text-center bg-transparent focus:bg-white dark:focus:bg-zinc-950 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 font-extrabold p-0 focus:p-1 outline-hidden transition ${
                                              item.stockMontevideo <= 0
                                                ? "text-zinc-400 dark:text-zinc-600"
                                                : "text-slate-800 dark:text-zinc-100"
                                            }`}
                                          />
                                          <button
                                            onClick={() => {
                                              const nextVal = item.stockMontevideo + 1;
                                              handleUpdateStockItem(item, "stockMontevideo", nextVal);
                                              showToast(`MVD de ${item.sku}: ${nextVal}u`, "success");
                                            }}
                                            className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800 text-zinc-500 hover:bg-emerald-500 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Sumar 1 unidad"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </td>

                                      {/* STOCK PIN */}
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5 font-mono">
                                          <button
                                            onClick={() => {
                                              const nextVal = Math.max(0, item.stockPinamar - 1);
                                              handleUpdateStockItem(item, "stockPinamar", nextVal);
                                              showToast(`PIN de ${item.sku}: ${nextVal}u`, "success");
                                            }}
                                            className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800 text-zinc-500 hover:bg-red-500 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Descontar 1 unidad"
                                          >
                                            -
                                          </button>
                                          <input
                                            type="number"
                                            value={item.stockPinamar}
                                            onChange={(e) => {
                                              const val = Math.max(0, parseInt(e.target.value) || 0);
                                              handleUpdateStockItem(item, "stockPinamar", val);
                                            }}
                                            className={`w-12 text-center bg-transparent focus:bg-white dark:focus:bg-zinc-950 rounded-md border-0 focus:ring-1 focus:ring-indigo-500 font-extrabold p-0 focus:p-1 outline-hidden transition ${
                                              item.stockPinamar <= 0
                                                ? "text-zinc-400 dark:text-zinc-600"
                                                : "text-slate-800 dark:text-zinc-100"
                                            }`}
                                          />
                                          <button
                                            onClick={() => {
                                              const nextVal = item.stockPinamar + 1;
                                              handleUpdateStockItem(item, "stockPinamar", nextVal);
                                              showToast(`PIN de ${item.sku}: ${nextVal}u`, "success");
                                            }}
                                            className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 dark:bg-zinc-800 text-zinc-500 hover:bg-emerald-500 hover:text-white transition opacity-0 group-hover:opacity-100 cursor-pointer"
                                            title="Sumar 1 unidad"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50 dark:bg-zinc-950/50">
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Mostrando <strong className="text-slate-800 dark:text-white">{filteredStockItems.length === 0 ? 0 : startIndex + 1}</strong> a <strong className="text-slate-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredStockItems.length)}</strong> de <strong className="text-slate-800 dark:text-white">{filteredStockItems.length}</strong> artículos
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              disabled={safePage <= 1}
                              onClick={() => setStockPage(prev => Math.max(1, prev - 1))}
                              className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                            >
                              Anterior
                            </button>

                            {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(pageNo => {
                              const shouldShow = pageNo === 1 || pageNo === totalPages || Math.abs(pageNo - safePage) <= 1;
                              if (!shouldShow) {
                                if (pageNo === 2 || pageNo === totalPages - 1) {
                                  return <span key={pageNo} className="px-1 text-xs text-zinc-450 dark:text-zinc-600 select-none font-bold">...</span>;
                                }
                                return null;
                              }
                              return (
                                <button
                                  key={pageNo}
                                  onClick={() => setStockPage(pageNo)}
                                  className={`w-8 h-8 flex items-center justify-center text-xs font-bold rounded-lg transition cursor-pointer ${
                                    safePage === pageNo
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900"
                                  }`}
                                >
                                  {pageNo}
                                </button>
                              );
                            })}

                            <button
                              disabled={safePage >= totalPages}
                              onClick={() => setStockPage(prev => Math.min(totalPages, prev + 1))}
                              className="px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-950 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition"
                            >
                              Siguiente
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })()}

                {/* AI Assistant panel onboarding to the new sidebar */}
                {adminSection === "assistant" && (
                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-8 max-w-xl mx-auto text-center space-y-6 shadow-xl">
                    <div className="w-16 h-16 bg-indigo-600/15 border border-indigo-500/30 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      <Sparkles className="h-8 w-8 animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-black text-white tracking-tight">¡Copilot IA Integrado en Todo el Panel!</h3>
                      <p className="text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
                        Para una experiencia más ágil, el Asistente de IA ahora vive en un panel lateral interactivo. Puedes abrirlo en **cualquier sección** (productos, pedidos, stock) sin perder de vista tu trabajo actual.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setShowAIAssistantSidebar(true);
                          navigateAdminSection("dashboard");
                        }}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 active:scale-95 transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Activar Copilot y Volver al Dashboard</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 11. PAYMENTS CONTROL CENTER PANEL */}
                {adminSection === "payments" && (
                  <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
                    <div className="space-y-1.5 pb-4 border-b border-slate-200 dark:border-zinc-800">
                      <h3 className="font-extrabold text-sm uppercase text-slate-800 dark:text-zinc-200 tracking-wider flex items-center gap-2">
                        <CreditCard className="h-4.5 w-4.5 text-indigo-500" />
                        <span>Pasarelas & Métodos de Pago Habilitados (Uruguay)</span>
                      </h3>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400">
                        Configura y personaliza qué métodos de pago ofreces a tus compradores uruguayos en la pantalla del carrito. Los clientes verán estas instrucciones y el método seleccionado se adjuntará de forma automatizada al iniciar el pedido en tu WhatsApp.
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Method 1: Mercado Pago Uruguay */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🇺🇾</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Mercado Pago Uruguay</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">Tarjetas de Crédito, Débito (OCA, VISA, MasterCard, Lider, Diners) y Cobros Abitab/Redpagos.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              mercadopagoActive: editingSettings.mercadopagoActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.mercadopagoActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.mercadopagoActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.mercadopagoActive !== false && (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                                Leyenda / Instrucción para el Comprador
                              </label>
                              <textarea
                                rows={2}
                                value={editingSettings.mercadopagoMessage || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, mercadopagoMessage: e.target.value })}
                                placeholder="Escribe las indicaciones o beneficios que el cliente visualizará..."
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                                    Clave Pública (Public Key)
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="ej: APP_USR-8cfaeed0-bf51-4040-af84-48ff61cb38b2"
                                    value={editingSettings.mercadopagoPublicKey || ""}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, mercadopagoPublicKey: e.target.value })}
                                    className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1">
                                    Token de Acceso (Access Token)
                                  </label>
                                  <div className="relative">
                                    <input
                                      type={showMpAccessToken ? "text" : "password"}
                                      placeholder="ej: APP_USR-492751947293-PROD..."
                                      value={editingSettings.mercadopagoAccessToken || ""}
                                      onChange={(e) => setEditingSettings({ ...editingSettings, mercadopagoAccessToken: e.target.value })}
                                      className="text-xs w-full pl-3 pr-10 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowMpAccessToken(!showMpAccessToken)}
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                                      title={showMpAccessToken ? "Ocultar token" : "Mostrar token"}
                                    >
                                      {showMpAccessToken ? (
                                        <EyeOff className="h-4 w-4" />
                                      ) : (
                                        <Eye className="h-4 w-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <span>Tipo de Cambio ($ UYU por 1 USD)</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.1"
                                    placeholder="40"
                                    value={editingSettings.exchangeRate || 40}
                                    onChange={(e) => setEditingSettings({ ...editingSettings, exchangeRate: parseFloat(e.target.value) || 40 })}
                                    className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white font-mono"
                                  />
                                </div>
                              </div>
                              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] leading-relaxed flex flex-col justify-between">
                                <div>
                                  <span className="font-bold block mb-1">🇲🇵 Pasarela de Mercado Pago Uruguay:</span>
                                  <p className="opacity-90 leading-normal mb-2">
                                    Al ingresar tu **Public Key** y **Access Token**, la pasarela de pagos integrada en la web se activará de forma real. Tus compradores podrán pagar directamente usando tarjetas o redes físicas de Uruguay de forma totalmente segura.
                                  </p>
                                  <p className="opacity-90 leading-normal">
                                    Si dejas los campos en blanco, la web funcionará en modo **Link de Pago Manual**, el cual permite coordinar con el comprador el envío del link seguro de Mercado Pago directamente por chat de WhatsApp al concretar el pedido.
                                  </p>
                                </div>
                                <span className="text-[8px] text-green-400 mt-2 block">✓ Integración dinámica y tipo de cambio listos para usarse</span>
                              </div>
                            </div>

                            {/* Botón directo de verificación y salvado de claves */}
                            <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-zinc-900/40 p-4 rounded-xl">
                              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 max-w-md">
                                <span className="font-bold text-slate-800 dark:text-zinc-200 block mb-0.5">¿Ingresaste tus credenciales correctamente?</span>
                                Haz click en el botón de la derecha para aplicar, guardar y validar tus claves de Mercado Pago de inmediato en la tienda.
                              </div>
                              <button
                                type="button"
                                id="btn-save-mercadopago-keys"
                                onClick={() => {
                                  const updatedState = { ...store, settings: editingSettings };
                                  saveStateToServer(updatedState).then(() => {
                                    showAdminToast("¡Aceptado! Credenciales de Mercado Pago guardadas con éxito.", "success");
                                  });
                                }}
                                disabled={saving}
                                className="w-full sm:w-auto shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/10 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                <span>{saving ? "Guardando..." : "Aceptar y Guardar Claves"}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Method 2: Transferencia Bancaria Directa */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏦</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Transferencia Bancaria Uruguaya</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">BROU, Itaú, Santander, BBVA, Scotiabank u otros bancos nacionales.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              transferActive: editingSettings.transferActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.transferActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.transferActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.transferActive !== false && (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                                Datos de Cuenta Bancaria / CBU / Alias
                              </label>
                              <textarea
                                rows={3}
                                value={editingSettings.transferDetails || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, transferDetails: e.target.value })}
                                placeholder="Escribe el Banco, Número de Caja de Ahorro, Moneda (UYU/USD), Nombre del titular y RUT/Documento..."
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Method 3: Efectivo Contraentrega */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">💵</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Efectivo contra el envío (Contraentrega)</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Recomendado para logística propia en Montevideo o áreas coordinadas.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              cashActive: editingSettings.cashActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.cashActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.cashActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.cashActive !== false && (
                          <div className="space-y-3 pt-2">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                                Requisitos / Limitaciones de Entrega
                              </label>
                              <textarea
                                rows={2}
                                value={editingSettings.cashMessage || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, cashMessage: e.target.value })}
                                placeholder="Escribe las zonas de cobertura para cobros físicos..."
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Submit Saving command */}
                    <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/10 active:scale-95"
                      >
                        <Save className="h-4 w-4" />
                        <span>Sincronizar y Guardar Métodos de Pago</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* 11b. CHECKOUT & SHIPPING CONTROL CENTER PANEL */}
                {adminSection === "checkout_config" && (
                  <div className="bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 space-y-6 shadow-sm">
                    <div className="space-y-1.5 pb-4 border-b border-slate-200 dark:border-zinc-800">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🛒</span> Configuración de Carrito y Envíos
                      </h3>
                      <p className="text-zinc-500 text-xs font-semibold leading-relaxed">
                        Controla las opciones de entrega que se muestran al comprador en el checkout, el retiro físico en local, y habilita la facturación con RUT.
                      </p>
                    </div>

                    <div className="space-y-5">
                      {/* 1. RETIRO EN LOCAL */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🏪</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Retiro físico en empresa (Pickup)</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Permite a los usuarios retirar sus pedidos directamente en tu local comercial.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              pickupActive: editingSettings.pickupActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.pickupActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.pickupActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.pickupActive !== false && (
                          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-zinc-800/60 mt-2">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                                Dirección Física del Local
                              </label>
                              <input
                                type="text"
                                value={editingSettings.pickupAddress || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, pickupAddress: e.target.value })}
                                placeholder="Ej: Av. Italia 3824, Parque Batlle, Montevideo, Uruguay"
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                                  Horarios de Atención
                                </label>
                                <input
                                  type="text"
                                  value={editingSettings.pickupHours || ""}
                                  onChange={(e) => setEditingSettings({ ...editingSettings, pickupHours: e.target.value })}
                                  placeholder="Ej: Lunes a Viernes de 10:00 a 18:00 hs"
                                  className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
                                  Mensaje de Disponibilidad
                                </label>
                                <input
                                  type="text"
                                  value={editingSettings.pickupSuccessMessage || ""}
                                  onChange={(e) => setEditingSettings({ ...editingSettings, pickupSuccessMessage: e.target.value })}
                                  placeholder="Ej: Listo para retirar el mismo día hábil"
                                  className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 2. ENVÍO A DOMICILIO */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🚚</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Envío a domicilio</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Habilita o deshabilita los métodos de entrega del país.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              deliveryActive: editingSettings.deliveryActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.deliveryActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.deliveryActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.deliveryActive !== false && (
                          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800/60 mt-2">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                                Métodos de entrega disponibles ({ (editingSettings.deliveryMethods || []).length })
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentMethods = editingSettings.deliveryMethods || [
                                    { id: "express_mvd", title: "Envío Express en 3 horas dentro de Montevideo (ver zonas)", subtext: "*antes de 16h de L a V", iconType: "motorcycle" },
                                    { id: "mvd_normal", title: "Envío dentro de Montevideo (24 a 48 horas)", subtext: null, iconType: "truck_orange" },
                                    { id: "ues", title: "Envío a todo el país por UES", subtext: null, iconType: "ues" },
                                    { id: "dac", title: "Envío a todo el país por DAC (Agencia Central)", subtext: null, iconType: "dac" },
                                    { id: "depunta", title: "Envío a Maldonado por De Punta", subtext: null, iconType: "depunta" }
                                  ];
                                  const newMethod = {
                                    id: "delivery_" + Date.now(),
                                    title: "Nuevo método de envío",
                                    subtext: "Coordinación posterior",
                                    iconType: "truck_orange"
                                  };
                                  setEditingSettings({
                                    ...editingSettings,
                                    deliveryMethods: [...currentMethods, newMethod]
                                  });
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-extrabold uppercase transition cursor-pointer"
                              >
                                + Agregar método
                              </button>
                            </div>

                            <div className="space-y-3">
                              {(() => {
                                const listMethods = editingSettings.deliveryMethods || [
                                  { id: "express_mvd", title: "Envío Express en 3 horas dentro de Montevideo (ver zonas)", subtext: "*antes de 16h de L a V", iconType: "motorcycle" },
                                  { id: "mvd_normal", title: "Envío dentro de Montevideo (24 a 48 horas)", subtext: null, iconType: "truck_orange" },
                                  { id: "ues", title: "Envío a todo el país por UES", subtext: null, iconType: "ues" },
                                  { id: "dac", title: "Envío a todo el país por DAC (Agencia Central)", subtext: null, iconType: "dac" },
                                  { id: "depunta", title: "Envío a Maldonado por De Punta", subtext: null, iconType: "depunta" }
                                ];

                                return listMethods.map((method, idx) => (
                                  <div key={method.id} className="p-4 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-3 relative group">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = listMethods.filter((_, i) => i !== idx);
                                        setEditingSettings({ ...editingSettings, deliveryMethods: updated });
                                      }}
                                      className="absolute right-3 top-3 text-red-500 hover:text-red-600 transition text-[10px] font-bold uppercase cursor-pointer"
                                      title="Eliminar método"
                                    >
                                      ELIMINAR ×
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                      <div className="md:col-span-6">
                                        <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Título del Envío</label>
                                        <input
                                          type="text"
                                          value={method.title}
                                          onChange={(e) => {
                                            const updated = listMethods.map((m, i) => i === idx ? { ...m, title: e.target.value } : m);
                                            setEditingSettings({ ...editingSettings, deliveryMethods: updated });
                                          }}
                                          placeholder="Ej: Envío Express"
                                          className="text-xs w-full px-2.5 py-1.5 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                                        />
                                      </div>

                                      <div className="md:col-span-3">
                                        <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Subtexto / Detalle</label>
                                        <input
                                          type="text"
                                          value={method.subtext || ""}
                                          onChange={(e) => {
                                            const updated = listMethods.map((m, i) => i === idx ? { ...m, subtext: e.target.value || null } : m);
                                            setEditingSettings({ ...editingSettings, deliveryMethods: updated });
                                          }}
                                          placeholder="Aclaración rápida"
                                          className="text-xs w-full px-2.5 py-1.5 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                                        />
                                      </div>

                                      <div className="md:col-span-3">
                                        <label className="block text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Icono / Logotipo</label>
                                        <select
                                          value={method.iconType}
                                          onChange={(e) => {
                                            const updated = listMethods.map((m, i) => i === idx ? { ...m, iconType: e.target.value } : m);
                                            setEditingSettings({ ...editingSettings, deliveryMethods: updated });
                                          }}
                                          className="text-xs w-full px-2.5 py-1.5 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                                        >
                                          <option value="truck_orange">🚚 Camión Naranja</option>
                                          <option value="motorcycle">🏍️ Moto Express</option>
                                          <option value="ues">📦 UES Logo</option>
                                          <option value="dac">📦 DAC Logo</option>
                                          <option value="depunta">📦 De Punta Logo</option>
                                          <option value="truck">📦 Paquete General</option>
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. FACTURACIÓN CON RUT */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🧾</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Facturación con RUT</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium font-sans">Permite al comprador solicitar factura oficial ingresando RUT de 12 dígitos y Razón Social.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              invoiceOptionActive: editingSettings.invoiceOptionActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.invoiceOptionActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.invoiceOptionActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* 4. ENVÍO GRATUITO CONFIGURABLE */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">🎁</span>
                            <div>
                              <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Envío Gratis por Zona</h4>
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium font-sans">Configura un monto mínimo de compra y las zonas/localidades que acceden al envío gratuito.</p>
                            </div>
                          </div>
                          
                          {/* Toggle switch for Free Shipping */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              freeShippingActive: editingSettings.freeShippingActive === false ? true : false
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              editingSettings.freeShippingActive !== false ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                editingSettings.freeShippingActive !== false ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {editingSettings.freeShippingActive !== false && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-zinc-800/60 font-sans">
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Monto de Compra Mínimo ($)</label>
                              <input
                                type="number"
                                value={editingSettings.freeShippingMinAmount !== undefined ? editingSettings.freeShippingMinAmount : 2000}
                                onChange={(e) => setEditingSettings({ ...editingSettings, freeShippingMinAmount: Number(e.target.value) })}
                                placeholder="Ej: 2000"
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Zonas con Envío Gratis (Separado por comas)</label>
                              <input
                                type="text"
                                value={editingSettings.freeShippingRegions || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, freeShippingRegions: e.target.value })}
                                placeholder="Ej: Pinamar, Salinas, Marindia, Neptunia"
                                className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                              />
                              <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-tight">Cualquier entrega en la zona de Canelones que figure en este campo recibirá Envío Gratis si el subtotal supera el monto indicado.</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 5. DESTINATARIO PREESTABLECIDO */}
                      <div className="p-5 bg-gradient-to-br from-white to-slate-50 dark:from-zinc-900/40 dark:to-zinc-900/25 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">👤</span>
                          <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-zinc-200">Datos por Defecto del Comprador</h4>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Define los datos cargados automáticamente en el checkout como sugeridos de inicio.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Nombre Inicial</label>
                            <input
                              type="text"
                              value={editingSettings.defaultFirstName || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, defaultFirstName: e.target.value })}
                              placeholder="Ej: Christian"
                              className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Apellido Inicial</label>
                            <input
                              type="text"
                              value={editingSettings.defaultLastName || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, defaultLastName: e.target.value })}
                              placeholder="Ej: Olivera"
                              className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">Celular Inicial</label>
                            <input
                              type="text"
                              value={editingSettings.defaultPhone || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, defaultPhone: e.target.value })}
                              placeholder="Ej: 095085181"
                              className="text-xs w-full px-3 py-2 rounded-lg border outline-none bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Submit Saving command */}
                    <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/10 active:scale-95"
                      >
                        <Save className="h-4 w-4" />
                        <span>Sincronizar y Guardar Cambios de Carrito</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 9.5 GOOGLE REVIEWS & ANALYTICS INTEGRATIONS GROUP */}
                {adminSection === "reviews" && (
                  <div className="space-y-6 animate-fade-in select-none">
                    
                    {/* PANEL A: GOOGLE ANALYTICS 4 */}
                    <div className="p-6 bg-slate-50 dark:bg-zinc-950/40 rounded-3xl border border-slate-200 dark:border-zinc-800/50 space-y-4">
                      {/* Banner Info */}
                      <div className="flex gap-4 items-start pb-4 border-b border-slate-200 dark:border-zinc-800">
                        <div className="p-3 bg-[#4285F4]/10 text-[#4285F4] rounded-2xl shrink-0">
                          <Globe className="w-6 h-6 text-[#4285F4] animate-pulse" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <h3 className="font-extrabold text-base text-slate-800 dark:text-zinc-100">Analytics de Google (GA4)</h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                            Mide de manera 100% automatizada el tráfico de tu tienda online, el interés en stock de productos de cada talle y las ventas finales. Al ingresar tu ID de Medición de Google Analytics 4, la plataforma disparará eventos de métricas de alta conversión en tiempo real.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                              Google Analytics ID de Medición (Measurement ID)
                            </label>
                            <input
                              type="text"
                              value={editingSettings.googleAnalyticsId || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, googleAnalyticsId: e.target.value.trim() })}
                              className="w-full px-4 py-3 bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-zinc-600"
                              placeholder="p.ej. G-XXXXXXXXXX"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1e40af] animate-pulse"></span>
                              Google Tag Manager ID (GTM Container ID)
                            </label>
                            <input
                              type="text"
                              value={editingSettings.googleTagManagerId || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, googleTagManagerId: e.target.value.trim() })}
                              className="w-full px-4 py-3 bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-zinc-600"
                              placeholder="p.ej. GTM-WVZZ4FT"
                            />
                          </div>
                        </div>

                        <div className="bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/10 dark:border-blue-900/20 rounded-xl p-3.5 space-y-1.5">
                          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">⚡ Métricas de Comercio Electrónico Sincronizadas:</span>
                          <ul className="text-[10px] text-slate-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                            <li><strong className="text-slate-800 dark:text-zinc-200">page_view:</strong> Seguimiento automático de navegación en store, carrito, consola de administrador y más.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">view_item:</strong> Interacción directa con prendas o artículos (registra item_name, precio y categoría).</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">add_to_cart:</strong> Registra la selección y adición de talles y variantes antes de iniciar el pedido.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">begin_checkout:</strong> Intención de pago iniciada al entrar al carrito final.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">purchase:</strong> Órdenes exitosas disparadas para Mercado Pago y compras en directo mediante WhatsApp.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">Google Tag Manager:</strong> Inyección directa asoncrónica de contenedores de etiquetas personalizados y píxeles de conversión.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* PANEL A.2: META PIXEL (FACEBOOK PIXEL) */}
                    <div className="p-6 bg-slate-50 dark:bg-zinc-950/40 rounded-3xl border border-slate-200 dark:border-zinc-800/50 space-y-4">
                      {/* Banner Info */}
                      <div className="flex gap-4 items-start pb-4 border-b border-slate-200 dark:border-zinc-800">
                        <div className="p-3 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl shrink-0">
                          <Facebook className="w-6 h-6 text-[#1877F2] animate-pulse" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <h3 className="font-extrabold text-base text-slate-800 dark:text-zinc-100">Píxel de Meta (Facebook Pixel)</h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                            Vincula tu Píxel de Meta para medir de forma automatizada las conversiones de tus campañas de Facebook e Instagram Ads. La tienda reportará en tiempo real el comportamiento de tus clientes en Uruguay para crear públicos de retargeting de alta conversión.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-extrabold text-[#1877F2] dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5 font-sans">
                              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1877F2] animate-pulse"></span>
                              Meta Pixel ID (ID del Píxel de Facebook)
                            </label>
                            <input
                              type="text"
                              value={editingSettings.metaPixelId || ""}
                              onChange={(e) => setEditingSettings({ ...editingSettings, metaPixelId: e.target.value.trim() })}
                              className="w-full px-4 py-3 bg-slate-50/50 dark:bg-zinc-900/30 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white font-mono placeholder-slate-400 dark:placeholder-zinc-600"
                              placeholder="p.ej. 1214041725895312"
                            />
                          </div>
                        </div>

                        <div className="bg-[#1877F2]/5 dark:bg-[#1877F2]/10 border border-[#1877F2]/10 dark:border-[#1877F2]/20 rounded-xl p-3.5 space-y-1.5">
                          <span className="text-[11px] font-bold text-[#1877F2] dark:text-[#1877F2] block">🎯 Eventos Estándar de Meta Reportados de Forma Automática:</span>
                          <ul className="text-[10px] text-slate-600 dark:text-zinc-400 space-y-1 list-disc list-inside">
                            <li><strong className="text-slate-800 dark:text-zinc-200">PageView:</strong> Reportado al instante cada vez que un usuario navega por tu tienda.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">ViewContent:</strong> Reportado al ingresar a ver la ficha detallada de un producto (fomenta retargeting específico).</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">AddToCart:</strong> Reportado al añadir variantes de talle o color al carrito.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">InitiateCheckout:</strong> Reportado cuando entran al checkout con intención de concretar compra.</li>
                            <li><strong className="text-slate-800 dark:text-zinc-200">Purchase:</strong> Reportado con valor en pesos uruguayos (UYU) y lista de productos para compras con Mercado Pago y confirmaciones vía WhatsApp.</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* PANEL B: GOOGLE REVIEWS */}
                    <div className="p-6 bg-slate-50 dark:bg-zinc-950/40 rounded-3xl border border-slate-200 dark:border-zinc-800/50 space-y-4">
                      
                      {/* Banner Info */}
                      <div className="flex gap-4 items-start pb-4 border-b border-slate-200 dark:border-zinc-800">
                        <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl shrink-0">
                          <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-extrabold text-base text-slate-800 dark:text-zinc-100">Configuración de Opiniones de Google</h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                            Aumenta drásticamente las ventas de tu tienda mostrando pruebas sociales reales y creíbles de tus clientes de Uruguay. Puedes sincronizar opiniones reales desde Google Maps o personalizar tu propia lista de testimonios de confianza con fotos de perfil personalizadas.
                          </p>
                        </div>
                      </div>

                      {/* Master Switch */}
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/30">
                        <div className="space-y-0.5 pr-4">
                          <span className="font-extrabold text-xs block text-slate-800 dark:text-zinc-100">
                            Mostrar widget de Opiniones en la web
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                            Habilita o deshabilita por completo la visualización de la reputación en el pie de página de la tienda online.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingSettings({ 
                            ...editingSettings, 
                            googleReviewsEnabled: editingSettings.googleReviewsEnabled === false ? true : false 
                          })}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            editingSettings.googleReviewsEnabled !== false ? "bg-indigo-600" : "bg-slate-200 dark:bg-zinc-700"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              editingSettings.googleReviewsEnabled !== false ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      {/* Origen Selector */}
                      <div className="space-y-3">
                        <label className="block text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                          Origen de las Opiniones
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Option Custom */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({ ...editingSettings, googleReviewsSource: "custom" })}
                            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                              (editingSettings.googleReviewsSource || "custom") === "custom"
                                ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/10"
                                : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full border-1.5 flex items-center justify-center border-slate-300 dark:border-zinc-600 mt-0.5">
                              {(editingSettings.googleReviewsSource || "custom") === "custom" && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                              )}
                            </span>
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-xs block text-slate-800 dark:text-zinc-100">
                                Manuales / Lista de Alta Conversión
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                                Testimonios premium pre-elaborados mencionando productos reales de Uruguay. Optimiza las ventas sin depender de APIs de terceros.
                              </span>
                            </div>
                          </button>

                          {/* Option API */}
                          <button
                            type="button"
                            onClick={() => setEditingSettings({ ...editingSettings, googleReviewsSource: "api" })}
                            className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                              editingSettings.googleReviewsSource === "api"
                                ? "border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/10"
                                : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span className="w-5 h-5 rounded-full border-1.5 flex items-center justify-center border-slate-300 dark:border-zinc-600 mt-0.5">
                              {editingSettings.googleReviewsSource === "api" && (
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                              )}
                            </span>
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-xs block text-slate-800 dark:text-zinc-100">
                                Sincronización Tiempo Real Google Places API
                              </span>
                              <span className="text-[10px] text-slate-500 dark:text-zinc-400 block leading-tight">
                                Conecta directamente tu comercio de Google My Business a través de la API oficial de Google Maps para traer opiniones de tu local físico.
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Custom Mode Extra Settings */}
                      {(editingSettings.googleReviewsSource || "custom") === "custom" && (
                        <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-zinc-800/60">
                          <label className="block text-[11px] font-black uppercase tracking-widest text-indigo-500">
                            Estadísticas Sembradas de la Tienda
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                Calificación General Promedio
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                min="1.0"
                                max="5.0"
                                value={editingSettings.googleReviewsRating ?? 4.9}
                                onChange={(e) => setEditingSettings({ ...editingSettings, googleReviewsRating: parseFloat(e.target.value) || 4.9 })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                Cantidad Total de Opiniones
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={editingSettings.googleReviewsTotal ?? 184}
                                onChange={(e) => setEditingSettings({ ...editingSettings, googleReviewsTotal: parseInt(e.target.value) || 184 })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* API Keys Configuration Mode */}
                      {editingSettings.googleReviewsSource === "api" && (
                        <div className="space-y-4 pt-4 border-t border-slate-200/50 dark:border-zinc-800/60 animate-fade-in">
                          <label className="block text-[11px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1">
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Credenciales de API de Google Maps & Google Cloud</span>
                          </label>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                Clave API de Google Places (Places API Key)
                              </label>
                              <input
                                type="text"
                                placeholder="AIzaSy..."
                                value={editingSettings.googlePlacesApiKey || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, googlePlacesApiKey: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                Google Place ID (Identificador de Local)
                              </label>
                              <input
                                type="text"
                                placeholder="p.ej. ChIJHZFnxeUhoJURtA0cWV3PH2A"
                                value={editingSettings.googlePlaceId || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, googlePlaceId: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* Google Maps Place Finder Widget */}
                          <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/40 space-y-3">
                            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>Buscador de Negocios en Google Maps (Place Finder / Buscador de ID)</span>
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 leading-normal font-sans">
                              Escribe el nombre comercial de tu local físico (por ejemplo, <strong>Ventas Juem Montevideo</strong> o tu nombre registrado) tal como figura en Google Maps para buscar tu Place ID oficial de inmediato.
                            </p>
                            
                            <div className="flex gap-2 font-sans">
                              <input
                                type="text"
                                placeholder="Escribe el nombre de tu local..."
                                value={googlePlaceSearchQuery}
                                onChange={(e) => setGooglePlaceSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleSearchGooglePlace();
                                  }
                                }}
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={handleSearchGooglePlace}
                                disabled={googlePlaceSearchLoading}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/40 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              >
                                {googlePlaceSearchLoading ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Search className="w-3.5 h-3.5" />
                                )}
                                <span>Buscar Local</span>
                              </button>
                            </div>

                            {googlePlaceSearchError && (
                              <p className="text-[10.5px] text-red-500 font-medium font-sans">⚠️ {googlePlaceSearchError}</p>
                            )}

                            {googlePlaceSearchResults.length > 0 && (
                              <div className="space-y-1.5 pt-1.5 max-h-[190px] overflow-y-auto pr-1 font-sans">
                                <span className="block text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                                  Haz clic en tu local comercial para enlazarlo:
                                </span>
                                {googlePlaceSearchResults.map((candidate: any) => (
                                  <button
                                    key={candidate.place_id}
                                    type="button"
                                    onClick={() => {
                                      setEditingSettings({
                                        ...editingSettings,
                                        googlePlaceId: candidate.place_id
                                      });
                                      showAdminToast(`ID de local seleccionado: ${candidate.name}`, "success");
                                    }}
                                    className={`w-full p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                                      editingSettings.googlePlaceId === candidate.place_id
                                        ? "border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 ring-1 ring-emerald-500/30"
                                        : "border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-slate-50 dark:hover:bg-zinc-900"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between w-full gap-2 font-sans">
                                      <span className="font-extrabold text-[11px] text-slate-800 dark:text-zinc-200">
                                        {candidate.name}
                                      </span>
                                      {candidate.rating && (
                                        <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-extrabold shrink-0">
                                          ⭐ {candidate.rating}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[9.5px] text-slate-500 dark:text-zinc-400 block truncate leading-tight">
                                      {candidate.formatted_address}
                                    </span>
                                    <span className="text-[9px] text-indigo-500 font-mono block mt-0.5 truncate bg-indigo-500/5 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded w-fit">
                                      ID: {candidate.place_id}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                ID de Cliente Google OAuth (Client ID)
                              </label>
                              <input
                                type="text"
                                placeholder="p.ej. 636443717801-..."
                                value={editingSettings.googleClientId || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, googleClientId: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                                Secreto de Cliente Google OAuth (Client Secret)
                              </label>
                              <input
                                type="password"
                                placeholder="••••••••••••••••••••"
                                value={editingSettings.googleClientSecret || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, googleClientSecret: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>
                          </div>

                          {/* Connection Card Section */}
                          <div className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/60 space-y-4">
                            <span className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-zinc-400">
                              Estado de Sincronización Google My Business
                            </span>

                            {editingSettings.googleMyBusinessConnected ? (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                                <div className="flex items-center gap-3">
                                  {!!editingSettings.googleMerchantPicture ? (
                                    <img
                                      src={editingSettings.googleMerchantPicture || null}
                                      alt="Google Merchant profile"
                                      className="w-10 h-10 rounded-full border border-emerald-500/35 object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-extrabold text-xs">
                                      {(editingSettings.googleMerchantName || "M").charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-xs text-slate-800 dark:text-zinc-100">
                                        {editingSettings.googleMerchantName || "Comercio Vinculado"}
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-extrabold text-[8px] uppercase tracking-wider flex items-center gap-0.5">
                                        <CheckCircle2 className="w-2 h-2" />
                                        <span>Enlazado</span>
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 block font-mono">
                                      {editingSettings.googleMerchantEmail || "google-my-business@gmail.com"}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingSettings({
                                      ...editingSettings,
                                      googleMyBusinessConnected: false,
                                      googleMerchantName: "",
                                      googleMerchantEmail: "",
                                      googleMerchantPicture: ""
                                    });
                                    showAdminToast("Se ha desenlazado la cuenta de Google My Business.", "neutral");
                                  }}
                                  className="px-3 py-1.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] font-bold transition-all cursor-pointer"
                                >
                                  Desconectar Cuenta
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-xs text-slate-800 dark:text-zinc-100 block">
                                    Cuenta Desconectada
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-zinc-400 block max-w-md leading-relaxed">
                                    Haz clic en el botón de la derecha para conectarte con OAuth y verificar la reputación de tu local.
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleGoogleConnect}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-extrabold tracking-wide uppercase transition-all shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  <span>Conectar con Google</span>
                                </button>
                              </div>
                            )}

                            {/* URIs Instruction Alert */}
                            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-[10px] leading-relaxed text-slate-500 dark:text-zinc-400 space-y-1 font-sans">
                              <span className="font-extrabold text-slate-700 dark:text-zinc-300 block uppercase tracking-wide">
                                📋 URI de Redirección Autorizada para Google Console:
                              </span>
                              <p className="font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/80 p-2 rounded-lg text-slate-800 dark:text-zinc-200 select-all overflow-x-auto text-[9.5px]">
                                {window.location.protocol}//{window.location.host}/auth/callback/
                              </p>
                              <p className="leading-tight pt-1">
                                Para que la conexión de Google My Business funcione, debes copiar este enlace exacto y pegarlo dentro de la pestaña de <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="underline font-bold text-indigo-600 dark:text-indigo-400">Google Cloud Credentials</a> en tu sección de <strong>"URIs de redireccionamiento autorizados"</strong>.
                              </p>
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs leading-relaxed space-y-1">
                            <span className="font-bold block">💡 ¿Dónde consigo mi Google Place ID?</span>
                            <p>
                              Puedes buscar el Place ID de cualquier comercio de Google Maps usando la herramienta oficial gratuita:{" "}
                              <a 
                                href="https://developers.google.com/maps/documentation/places/web-service/place-id" 
                                target="_blank" 
                                rel="noreferrer noopener"
                                className="underline font-bold text-indigo-600 dark:text-indigo-400"
                              >
                                Google Maps Place ID Finder Tool
                              </a>. 
                              Copia el código hash que empiece con "ChI" e ingrésalo arriba.
                            </p>
                          </div>
                        </div>
                      )}

                    </div>

                    {/* CUSTOM REVIEWS LIST MANAGER */}
                    {(editingSettings.googleReviewsSource || "custom") === "custom" && (
                      <div className="p-6 bg-slate-50 dark:bg-zinc-950/40 rounded-3xl border border-slate-200 dark:border-zinc-800/50 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-zinc-800">
                          <div>
                            <h4 className="font-black text-xs text-slate-800 dark:text-zinc-100 uppercase tracking-widest">Opiniones Manuales Registradas</h4>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Agrega, edita o elimina testimonios realistas para el carrusel de opiniones.</p>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const backup = [
                                  {
                                    author_name: "Christian O.",
                                    profile_photo_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80",
                                    rating: 5,
                                    relative_time_description: "Hace 3 días",
                                    text: "Impresionante la atención por WhatsApp y la rapidez del envío. Compré el poncho buzo pijama plush de corderito y es súper abrigado, excelente calidad y talle correcto.",
                                    time: Date.now() / 1000 - 3 * 24 * 60 * 60,
                                    avatar_color: "emerald"
                                  },
                                  {
                                    author_name: "Valentina R.",
                                    profile_photo_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80",
                                    rating: 5,
                                    relative_time_description: "Hace 1 semana",
                                    text: "Excelente todo. Me asesoraron al instante por los talles de las medias pantalón térmicas efecto piel con corderito. Son re abrigadas y estiran súper bien. El envío express me llegó en menos de 2 horas en Montevideo.",
                                    time: Date.now() / 1000 - 7 * 24 * 60 * 60,
                                    avatar_color: "blue"
                                  },
                                  {
                                    author_name: "Gastón B.",
                                    profile_photo_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80",
                                    rating: 5,
                                    relative_time_description: "Hace 2 semanas",
                                    text: "Compré el soporte de pared para tablet ranurado por impresión 3D, quedó súper firme y prolijo. Increíble terminación, no parece impreso en plástico común, el material es re resistente. Recomendado 100%.",
                                    time: Date.now() / 1000 - 14 * 24 * 60 * 60,
                                    avatar_color: "indigo"
                                  },
                                  {
                                    author_name: "María Noel F.",
                                    profile_photo_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80",
                                    rating: 5,
                                    relative_time_description: "Hace 3 semanas",
                                    text: "Compré la lámpara UV mata mosquitos por recomendación porque en casa se llenaba de mosquitos, y la verdad un éxito. Es súper silenciosa, la tenemos prendida toda la noche en el cuarto. Envío rapidísimo a Canelones.",
                                    time: Date.now() / 1000 - 21 * 24 * 60 * 60,
                                    avatar_color: "purple"
                                  }
                                ];
                                setEditingSettings({
                                  ...editingSettings,
                                  googleReviewsCustomList: backup
                                });
                                showAdminToast("Se han precargado los 5 testimonios de alta conversión.", "success");
                              }}
                              className="px-3 py-1.5 text-[11px] font-bold bg-indigo-500/10 text-indigo-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                            >
                              Precargar Testimonios ★
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const currentList = editingSettings.googleReviewsCustomList || [];
                                const newReview = {
                                  author_name: "Nuevo Cliente " + (currentList.length + 1),
                                  profile_photo_url: "",
                                  rating: 5,
                                  relative_time_description: "Hace 1 día",
                                  text: "Excelente servicio y calidad de atención por WhatsApp. El pedido llegó súper rápido y súper bien empaquetado.",
                                  time: Date.now() / 1000,
                                  avatar_color: ["blue", "emerald", "indigo", "purple", "amber"][Math.floor(Math.random() * 5)]
                                };
                                setEditingSettings({
                                  ...editingSettings,
                                  googleReviewsCustomList: [newReview, ...currentList]
                                });
                                showAdminToast("Mensaje: Se ha añadido un borrador al inicio de tu lista.", "success");
                              }}
                              className="px-3.5 py-1.5 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Agregar Nueva</span>
                            </button>
                          </div>
                        </div>

                        {/* List representation */}
                        {(!editingSettings.googleReviewsCustomList || editingSettings.googleReviewsCustomList.length === 0) ? (
                          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800 text-slate-400">
                            No tienes opiniones manuales cargadas todavía. Actualmente el sistema muestra testimonios por defecto de manera inteligente. Haz clic en "Precargar Testimonios" o "Agregar Nueva" para tomar control absoluto.
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                            {editingSettings.googleReviewsCustomList.map((item, idx) => (
                              <div 
                                key={idx} 
                                className="p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-3 relative group"
                              >
                                {/* Quick Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const filterList = (editingSettings.googleReviewsCustomList || []).filter((_, i) => i !== idx);
                                    setEditingSettings({
                                      ...editingSettings,
                                      googleReviewsCustomList: filterList
                                    });
                                    showAdminToast("Se ha quitado la opinión seleccionada.", "success");
                                  }}
                                  className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-950 transition cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>

                                {/* Header of item editor */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  {/* Author Name */}
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Nombre del Autor</label>
                                    <input
                                      type="text"
                                      value={item.author_name}
                                      onChange={(e) => {
                                        const clone = [...(editingSettings.googleReviewsCustomList || [])];
                                        clone[idx] = { ...clone[idx], author_name: e.target.value };
                                        setEditingSettings({ ...editingSettings, googleReviewsCustomList: clone });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                    />
                                  </div>

                                  {/* Stars select */}
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Calificación (Puntos)</label>
                                    <select
                                      value={item.rating}
                                      onChange={(e) => {
                                        const clone = [...(editingSettings.googleReviewsCustomList || [])];
                                        clone[idx] = { ...clone[idx], rating: parseInt(e.target.value) || 5 };
                                        setEditingSettings({ ...editingSettings, googleReviewsCustomList: clone });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-semibold"
                                    >
                                      <option value="5">⭐⭐⭐⭐⭐ (5 Estrellas)</option>
                                      <option value="4">⭐⭐⭐⭐ (4 Estrellas)</option>
                                      <option value="3">⭐⭐⭐ (3 Estrellas)</option>
                                    </select>
                                  </div>

                                  {/* Relative description */}
                                  <div className="space-y-1 pr-6">
                                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-405">Tiempo de antigüedad</label>
                                    <input
                                      type="text"
                                      value={item.relative_time_description}
                                      onChange={(e) => {
                                        const clone = [...(editingSettings.googleReviewsCustomList || [])];
                                        clone[idx] = { ...clone[idx], relative_time_description: e.target.value };
                                        setEditingSettings({ ...editingSettings, googleReviewsCustomList: clone });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>

                                {/* Text content input and profile picture info */}
                                <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
                                  {/* Image profile optional URL */}
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 col-span-2">URL de foto de perfil (Opcional - vacío usa siglas)</label>
                                    <input
                                      type="text"
                                      value={item.profile_photo_url || ""}
                                      placeholder="https://images.unsplash.com/photo-..."
                                      onChange={(e) => {
                                        const clone = [...(editingSettings.googleReviewsCustomList || [])];
                                        clone[idx] = { ...clone[idx], profile_photo_url: e.target.value };
                                        setEditingSettings({ ...editingSettings, googleReviewsCustomList: clone });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                    />
                                  </div>

                                  {/* Review Paragraph */}
                                  <div className="space-y-1">
                                    <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Cuerpo de la reseña de opinión</label>
                                    <textarea
                                      rows={2}
                                      value={item.text}
                                      onChange={(e) => {
                                        const clone = [...(editingSettings.googleReviewsCustomList || [])];
                                        clone[idx] = { ...clone[idx], text: e.target.value };
                                        setEditingSettings({ ...editingSettings, googleReviewsCustomList: clone });
                                      }}
                                      className="w-full px-2 py-1.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white resize-none"
                                    />
                                  </div>
                                </div>

                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    )}

                    {/* Submit Saving command */}
                    <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-zinc-800">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/10 active:scale-95"
                      >
                        <Save className="h-4 w-4" />
                        <span>Sincronizar y Guardar Opiniones de Google</span>
                      </button>
                    </div>

                  </div>
                )}

                {/* 10. ACCESS SECURITY & CREDENTIALS CONFIG */}
                {adminSection === "security" && (
                  <SecurityPanel
                    authToken={authToken}
                    showAdminToast={showAdminToast}
                    setAuthToken={setAuthToken}
                  />
                )}

                {/* 11. AUTOMATIC EMAILS PANEL */}
                {adminSection === "emails" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Mail className="h-4 w-4 text-indigo-500" />
                            <span>Ajustes Generales del Servidor de Correo</span>
                          </h3>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                            Configura el servidor SMTP para que tus clientes reciban facturas y actualizaciones de estado en tiempo real.
                          </p>
                        </div>
                        {/* Toggle switch for emails */}
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase">
                            {editingSettings.emailSenderEnabled ? "🟢 Activo" : "🔴 Inactivo (Módulo Simulado)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingSettings({
                              ...editingSettings,
                              emailSenderEnabled: !editingSettings.emailSenderEnabled
                            })}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-1 focus:ring-indigo-500 ${
                              editingSettings.emailSenderEnabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-zinc-800'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                editingSettings.emailSenderEnabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 animate-fade-in">
                        {/* Selector de Proveedor de Email */}
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Proveedor de Email</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: 'resend', label: 'Resend API' },
                              { id: 'smtp', label: 'Servidor SMTP' },
                              { id: 'mailgun', label: 'Mailgun API' }
                            ].map((prov) => (
                              <button
                                key={prov.id}
                                type="button"
                                onClick={() => setEditingSettings({ ...editingSettings, emailSenderProvider: prov.id })}
                                className={`px-2 py-2.5 rounded-xl text-xs font-bold transition border cursor-pointer ${
                                  (editingSettings.emailSenderProvider || 'resend') === prov.id
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-600 dark:text-indigo-450 font-extrabold shadow-sm'
                                    : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-900'
                                }`}
                              >
                                {prov.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Campos dinámicos según el proveedor */}
                        {(editingSettings.emailSenderProvider || 'resend') === 'resend' && (
                          <div className="space-y-4 animate-fade-in">
                            {/* Resend API Key */}
                            <div className="space-y-1">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-indigo-400">Resend API Key</label>
                              <input
                                type="password"
                                placeholder="Tu API Key de Resend (Ej: re_eY9... o dejas en blanco para usar la Variable de Entorno)"
                                value={editingSettings.resendApiKey || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, resendApiKey: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            {/* Guide / Help Card */}
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10.5px] text-indigo-700 dark:text-indigo-300 leading-relaxed space-y-2 font-semibold">
                              <div className="text-[12px] text-indigo-800 dark:text-indigo-200 font-bold flex items-center gap-1">
                                <span>✨</span> Guía de Configuración de Resend:
                              </div>
                              <ul className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-zinc-300 font-medium">
                                <li>Consigue tu clave en <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline text-indigo-600">resend.com</a> e ingrésala arriba.</li>
                                <li>Con una cuenta gratuita, el remitente debe estar registrado o ser <code className="font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 px-1 py-0.5">onboarding@resend.dev</code>.</li>
                                <li>Sólo se permite enviar correos a tu correo personal de registro si no tienes un dominio propio verificado.</li>
                              </ul>
                            </div>
                          </div>
                        )}

                        {editingSettings.emailSenderProvider === 'smtp' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                            {/* SMTP Host */}
                            <div className="space-y-1 col-span-1 sm:col-span-2">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Servidor SMTP Host</label>
                              <input
                                type="text"
                                placeholder="smtp.gmail.com u otro"
                                value={editingSettings.emailSenderSmtpHost || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, emailSenderSmtpHost: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>
                            {/* SMTP Port */}
                            <div className="space-y-1">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Puerto SMTP</label>
                              <input
                                type="number"
                                placeholder="465"
                                value={editingSettings.emailSenderSmtpPort || 465}
                                onChange={(e) => setEditingSettings({ ...editingSettings, emailSenderSmtpPort: parseInt(e.target.value, 10) || 465 })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                              />
                            </div>
                            {/* SMTP User */}
                            <div className="space-y-1">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Usuario / Correo SMTP</label>
                              <input
                                type="text"
                                placeholder="tuusuario@gmail.com"
                                value={editingSettings.emailSenderSmtpUser || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, emailSenderSmtpUser: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>
                            {/* SMTP Pass */}
                            <div className="space-y-1 col-span-1 sm:col-span-2">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Contraseña SMTP / Clave de Aplicante</label>
                              <input
                                type="password"
                                placeholder="••••••••••••••••"
                                value={editingSettings.emailSenderSmtpPass || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, emailSenderSmtpPass: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            {/* SMTP Guide */}
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10.5px] text-indigo-700 dark:text-indigo-300 leading-relaxed space-y-1 font-semibold col-span-1 sm:col-span-2">
                              <div className="text-[12px] text-indigo-800 dark:text-indigo-200 font-bold">💡 Tip para Gmail SMTP:</div>
                              <p className="text-slate-600 dark:text-zinc-300 font-medium">
                                Para usar Gmail, debes tener activada la verificación en dos pasos en tu cuenta de Google y generar una "Contraseña de Aplicación" dedicada desde la seguridad de tu cuenta. No uses tu contraseña habitual. El puerto recomendado es 465 (Secure SSL).
                              </p>
                            </div>
                          </div>
                        )}

                        {editingSettings.emailSenderProvider === 'mailgun' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                            {/* Mailgun Domain */}
                            <div className="space-y-1">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Dominio de Mailgun</label>
                              <input
                                type="text"
                                placeholder="mg.tusitio.com o sandbox..."
                                value={editingSettings.mailgunDomain || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, mailgunDomain: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>
                            {/* Mailgun Region */}
                            <div className="space-y-1">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Región de Mailgun</label>
                              <select
                                value={editingSettings.mailgunRegion || "us"}
                                onChange={(e) => setEditingSettings({ ...editingSettings, mailgunRegion: e.target.value as 'us' | 'eu' })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-bold"
                              >
                                <option value="us">US - Estados Unidos (Default)</option>
                                <option value="eu">EU - Europa (api.eu.mailgun.net)</option>
                              </select>
                            </div>
                            {/* Mailgun API Key */}
                            <div className="space-y-1 col-span-1 sm:col-span-2">
                              <label className="block text-[8px] font-bold uppercase tracking-widest text-indigo-400">Mailgun Private API Key</label>
                              <input
                                type="password"
                                placeholder="api_key... o key-..."
                                value={editingSettings.mailgunApiKey || ""}
                                onChange={(e) => setEditingSettings({ ...editingSettings, mailgunApiKey: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                              />
                            </div>

                            {/* Mailgun Guide */}
                            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-[10.5px] text-indigo-700 dark:text-indigo-300 leading-relaxed space-y-1 font-semibold col-span-1 sm:col-span-2">
                              <div className="text-[12px] text-indigo-800 dark:text-indigo-200 font-bold">⚡ Configuración de Mailgun:</div>
                              <p className="text-slate-600 dark:text-zinc-300 font-medium">
                                Mailgun utiliza su API basada en HTTPS. Asegúrate de configurar correctamente tu dominio en <a href="https://mailgun.com" target="_blank" rel="noreferrer" className="underline text-indigo-600">mailgun.com</a>, seleccionar la región correcta, e introducir tu API Key privada y dominio verificado.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* From Address (Muestra para cualquier proveedor ya que todos comparten este remitente) */}
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Remitente Personalizado (FROM - Nombre &lt;email@tudominio.com&gt;)</label>
                          <input
                            type="text"
                            placeholder="Ventas Juem <no-reply@notificaciones.juem.com.uy>"
                            value={editingSettings.emailSenderFromAddress || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, emailSenderFromAddress: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Info note about simulated email logs */}
                      {!editingSettings.emailSenderEnabled ? (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-[11px] text-amber-600 dark:text-amber-400">
                          <Info className="h-4 w-4 shrink-0" />
                          <span>
                            <strong>Modo Simulación Activado:</strong> Si dejas el módulo inactivo o sin datos SMTP, todo correo generado por compras o cambio de estados se registrará abajo como <strong>"Simulado"</strong> para que puedas probar y ver el diseño exacto del mensaje sin enviar correos reales.
                          </span>
                        </div>
                      ) : (
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-[11px] text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            El servidor de correos está activo. Todo correo será despachado utilizando los parámetros configurados arriba.
                          </span>
                        </div>
                      )}

                      {/* Tester tool */}
                      <div className="pt-4 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                          <div className="space-y-1 flex-1">
                            <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Probar Conexión (Email Destinatario)</label>
                            <input
                              type="email"
                              placeholder="ejemplo@correo.com"
                              value={testEmailAddress}
                              onChange={(e) => setTestEmailAddress(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleSendTestEmail}
                            disabled={sendingTest}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer h-10"
                          >
                            {sendingTest ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            <span>Enviar Correo de Prueba</span>
                          </button>
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/10 active:scale-95 animate-pulse"
                        >
                          <Save className="h-4 w-4" />
                          <span>Guardar Ajustes de Correo 💾</span>
                        </button>
                      </div>
                    </div>

                    {/* Email templates styling */}
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4 shadow-sm">
                      <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Palette className="h-4 w-4 text-indigo-500" />
                        <span>Personalizar Diseño y Plantillas de Correo</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                        Configura el diseño visual de tus notificaciones automáticas utilizando una imagen de cabecera sincronizada con Cloudinary y define los asuntos y cuerpos de mensajes dinámicos.
                      </p>

                      <div className="grid grid-cols-1 gap-4">
                        {/* Email Header Banner Uploader Section */}
                        <div className="space-y-3 p-4 bg-slate-50 dark:bg-zinc-950/40 rounded-xl border border-slate-200/60 dark:border-zinc-800/60 animate-fade-in">
                          <div className="flex items-center justify-between">
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-zinc-400">
                              Imagen de Cabecera del Correo (Banner Widescreen)
                            </label>
                            <span className="text-[9px] text-indigo-500 font-medium font-sans">Sugerido: 1200x500 (2.4:1 ratio)</span>
                          </div>
                          <input
                            type="text"
                            value={editingSettings.emailHeaderImageUrl || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, emailHeaderImageUrl: e.target.value })}
                            className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                            placeholder="URL del banner o sube una imagen abajo..."
                          />
                          
                          {!!editingSettings.emailHeaderImageUrl && (
                            <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-h-[140px]">
                              <img
                                src={editingSettings.emailHeaderImageUrl || null}
                                alt="Previsualización Banner Correo"
                                className="w-full max-h-[140px] object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/src/assets/images/juem_email_banner_1781008874987.png";
                                }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-0.5 rounded text-[8px] font-bold">Vista Previa Cabecera</div>
                            </div>
                          )}

                          <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/40">
                            <div className="space-y-0.5">
                              <p className="text-[9.5px] font-bold text-slate-700 dark:text-zinc-300">
                                Sincronizar Banner con Cloudinary:
                              </p>
                              <p className="text-[8.5px] text-slate-400 dark:text-zinc-500">
                                Sube imágenes panorámicas elegantes para que tus correos luzcan premium.
                              </p>
                            </div>
                            
                            <label 
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white font-bold text-[9.5px] cursor-pointer transition shadow-xs select-none ${
                                uploadingEmailHeader 
                                  ? "bg-slate-200 dark:bg-zinc-800 text-zinc-500 pointer-events-none animate-pulse" 
                                  : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                              }`}
                            >
                              {uploadingEmailHeader ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5346ff]" />
                                  <span className="font-mono">Subiendo...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3" />
                                  <span>Sube tu Banner</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingEmailHeader}
                                onChange={async (e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    const formData = new FormData();
                                    formData.append("image", file);
                                    try {
                                      setUploadingEmailHeader(true);
                                      const uploadRes = await fetch("/api/cloudinary/upload", {
                                        method: "POST",
                                        headers: {
                                          "Authorization": `Bearer ${localStorage.getItem("apex_admin_token") || ""}`
                                        },
                                        body: formData,
                                      });
                                      const resText = await uploadRes.text();
                                      let parsedData: any = null;
                                      try { parsedData = JSON.parse(resText); } catch (pErr) {}
                                      if (uploadRes.ok && parsedData && parsedData.success && parsedData.url) {
                                        setEditingSettings({ ...editingSettings, emailHeaderImageUrl: parsedData.url });
                                        showToast("¡Banner de correo subido e integrado con éxito! ✉️", "success");
                                      } else {
                                        showToast((parsedData && parsedData.message) || "Error al subir banner.", "error");
                                      }
                                    } catch (err) {
                                      showToast("Fallo al conectar con Cloudinary.", "error");
                                    } finally {
                                      setUploadingEmailHeader(false);
                                    }
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </div>

                        {/* Order created template */}
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Asunto para Compra Confirmada (Pedido Creado)</label>
                          <input
                            type="text"
                            value={editingSettings.emailTemplateOrderCreatedSubject || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, emailTemplateOrderCreatedSubject: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Mensaje Introductorio / Cuerpo (Pedido Creado)</label>
                          <textarea
                            rows={3}
                            value={editingSettings.emailTemplateOrderCreatedBody || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, emailTemplateOrderCreatedBody: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            placeholder="Escribe el mensaje que recibirá el cliente..."
                          />
                        </div>

                        {/* Order status updated template */}
                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Asunto para Cambio de Estado del Pedido</label>
                          <input
                            type="text"
                            value={editingSettings.emailTemplateOrderStatusChangedSubject || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, emailTemplateOrderStatusChangedSubject: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[8px] font-bold uppercase tracking-widest text-slate-400">Mensaje / Cuerpo de Notificación (Cambio de Estado)</label>
                          <textarea
                            rows={3}
                            value={editingSettings.emailTemplateOrderStatusChangedBody || ""}
                            onChange={(e) => setEditingSettings({ ...editingSettings, emailTemplateOrderStatusChangedBody: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 text-slate-900 dark:text-white"
                            placeholder="Escribe el mensaje que recibirá el cliente cuando su pedido cambie de estado..."
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wide flex items-center gap-2 cursor-pointer transition shadow-lg shadow-indigo-600/10 active:scale-95"
                        >
                          <Save className="h-4 w-4" />
                          <span>Guardar Plantillas</span>
                        </button>
                      </div>
                    </div>

                    {/* Live Email Visual Previewer - Mobile fallback only */}
                    <div className="lg:hidden p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Eye className="h-4 w-4 text-indigo-500" />
                            <span>Vista Previa Interactiva del Cliente</span>
                          </h3>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Previsualiza en tiempo real cómo lucen tus notificaciones antes de mandar correos de prueba.
                          </p>
                        </div>
                        <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-xl border border-slate-200/50 dark:border-zinc-800 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setEmailPreviewTab('created')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                              emailPreviewTab === 'created'
                                ? 'bg-white dark:bg-zinc-855 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            <CheckSquare className="h-3 w-3" />
                            <span>Pedido Recibido</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailPreviewTab('changed')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer ${
                              emailPreviewTab === 'changed'
                                ? 'bg-white dark:bg-zinc-855 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                            }`}
                          >
                            <Truck className="h-3 w-3" />
                            <span>Pedido Enviado</span>
                          </button>
                        </div>
                      </div>

                      {/* Mockup Mailbox Frame */}
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                        {/* Mock Email Header Controls */}
                        <div className="bg-slate-50 dark:bg-zinc-950 px-4 py-3 border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Bandeja de Entrada</span>
                          </div>
                          
                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-zinc-400 pt-1">
                            <div className="text-left">
                              <strong className="text-slate-400 dark:text-zinc-500 font-medium">De:</strong>{" "}
                              <span className="font-semibold text-slate-700 dark:text-zinc-200 bg-slate-300/50 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-[10px]">
                                {editingSettings.emailSenderFromAddress || `${editingSettings.siteTitle || "Ventas Juem"} <no-reply@tienda.com>`}
                              </span>
                            </div>
                            <div className="text-left">
                              <strong className="text-slate-400 dark:text-zinc-500 font-medium">Para:</strong>{" "}
                              <span className="font-semibold text-slate-700 dark:text-zinc-200 text-[11px]">Christian.olivera45@gmail.com</span>
                            </div>
                            <div className="flex items-baseline gap-1 pt-1.5 border-t border-slate-200/40 dark:border-zinc-800/40 text-left">
                              <strong className="text-slate-400 dark:text-zinc-500 font-medium pr-1">Asunto:</strong>{" "}
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs">
                                {emailPreviewTab === 'created' ? (
                                  editingSettings.emailTemplateOrderCreatedSubject ? (
                                    editingSettings.emailTemplateOrderCreatedSubject
                                      .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                      .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                      .replace(/\{\{total\}\}/g, "UYU $2.490")
                                      .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                                  ) : (
                                    `¡Gracias por tu compra! Tu pedido #6C3AA2 ha sido recibido`
                                  )
                                ) : (
                                  editingSettings.emailTemplateOrderStatusChangedSubject ? (
                                    editingSettings.emailTemplateOrderStatusChangedSubject
                                      .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                      .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                      .replace(/\{\{total\}\}/g, "UYU $2.490")
                                      .replace(/\{\{statusText\}\}/g, "Enviado 🚚")
                                      .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                                  ) : (
                                    `Actualización de tu pedido #6C3AA2 - Enviado 🚚`
                                  )
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Mail Canvas HTML Body Container - Emulating Real HTML exactly */}
                        <div className="bg-slate-50 dark:bg-zinc-950 p-3 sm:p-6 flex justify-center overflow-x-auto text-left">
                          <div className="w-full max-w-[550px] bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-md text-slate-800 text-[13px] leading-relaxed">
                            {/* Email Brand Header Banner */}
                            {editingSettings.emailHeaderImageUrl ? (
                              <div className="border-b-[4px] border-amber-500 overflow-hidden bg-[#0c1221] relative animate-fade-in">
                                <img
                                  src={editingSettings.emailHeaderImageUrl || "/src/assets/images/juem_email_banner_1781008874987.png"}
                                  alt={editingSettings.siteTitle || "Header"}
                                  className="w-full object-cover max-h-[220px]"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = "/src/assets/images/juem_email_banner_1781008874987.png";
                                  }}
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/50 py-3 px-4 text-center backdrop-blur-xs">
                                  <p className="m-0 text-white text-xs font-bold tracking-wide">
                                    {emailPreviewTab === 'created' 
                                      ? "¡Tu compra ha sido aprobada con éxito! 🎉" 
                                      : "¡Novedades de preparación y envío de paquete! 🚚"
                                    }
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-indigo-600 p-8 text-center text-white animate-fade-in">
                                {editingSettings.logoType === 'image' && !!editingSettings.logoImageUrl ? (
                                  <div className="mb-3 flex justify-center">
                                    <img 
                                      src={editingSettings.logoImageUrl || null} 
                                      alt={editingSettings.siteTitle || "Logo"} 
                                      className="max-h-16 max-w-[200px] object-contain rounded-lg bg-white/15 p-1"
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <h1 className="m-0 text-xl font-extrabold tracking-tight">
                                    {editingSettings.siteTitle || "Ventas Juem"}
                                  </h1>
                                )}
                                <p className="mt-2 text-xs opacity-90 font-medium max-w-[340px] mx-auto leading-normal">
                                  {emailPreviewTab === 'created' 
                                    ? "¡Tu compra ha sido aprobada con éxito! 🎉" 
                                    : "¡Novedades de preparación y envío de paquete! 🚚"
                                  }
                                </p>
                              </div>
                            )}

                            {/* Email Inner Body Padding */}
                            <div className="p-6 space-y-5">
                              <h2 className="text-sm font-extrabold text-slate-900">¡Hola, Christian Olivera!</h2>
                              
                              <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                                {emailPreviewTab === 'created' ? (
                                  editingSettings.emailTemplateOrderCreatedBody ? (
                                    editingSettings.emailTemplateOrderCreatedBody
                                      .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                      .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                      .replace(/\{\{total\}\}/g, "UYU $2.490")
                                      .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                                  ) : (
                                    "Muchas gracias por realizar tu compra con nosotros. Tu pago ha sido aprobado correctamente y tu pedido ya está siendo preparado para entrega. Aquí tienes los detalles completos de tu compra:"
                                  )
                                ) : (
                                  editingSettings.emailTemplateOrderStatusChangedBody ? (
                                    editingSettings.emailTemplateOrderStatusChangedBody
                                      .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                      .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                      .replace(/\{\{total\}\}/g, "UYU $2.490")
                                      .replace(/\{\{statusText\}\}/g, "Enviado 🚚")
                                      .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                                  ) : (
                                    "Te notificamos que el estado de tu pedido #6C3AA2 ha sido actualizado por nuestro equipo de logística."
                                  )
                                )}
                              </p>

                              {/* Order Metadata Box Card */}
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs text-slate-600">
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                  <span className="text-slate-400 font-semibold">Número de Pedido:</span>
                                  <span className="font-mono font-bold text-indigo-600">#6C3AA2</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 pb-2">
                                  <span className="text-slate-400 font-semibold">Fecha de Compra:</span>
                                  <span className="text-slate-800 font-medium font-mono">08/06/2026 20:06</span>
                                </div>
                                <div className="flex justify-between pb-1">
                                  <span className="text-slate-400 font-semibold pr-4">Método de Pago:</span>
                                  <span className="text-slate-800 font-bold text-right">Mercado Pago Uruguay</span>
                                </div>
                              </div>

                              {/* Delivery status indicator badge block (shown for status changed) */}
                              {emailPreviewTab === 'changed' && (
                                <div className="border border-indigo-100 rounded-xl bg-indigo-50/40 p-4 text-center space-y-2">
                                  <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-600 block">Nuevo Estado del Envío</span>
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-xs font-extrabold text-slate-800">Despachado / Enviado 🚚</span>
                                  </div>
                                </div>
                              )}

                              {/* Table Items Header */}
                              <div className="border-b-2 border-slate-200 pb-2 pt-1">
                                <span className="text-[9px] uppercase tracking-widest font-extrabold text-slate-400">Detalle de Productos</span>
                              </div>

                              {/* Table Items */}
                              <table className="w-full text-xs text-left text-slate-600 border-collapse">
                                <thead>
                                  <tr className="bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase">
                                    <th className="p-2">Artículo</th>
                                    <th className="p-2 text-center w-12">Cant.</th>
                                    <th className="p-2 text-right w-16">Precio</th>
                                    <th className="p-2 text-right w-20">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr className="border-b border-slate-100">
                                    <td className="p-2 font-bold text-slate-800">Poncho Buzo Pijama Corderito <span className="text-[10px] text-slate-500 font-normal block">Talle: M - Color: Azul Marino</span></td>
                                    <td className="p-2 text-center text-slate-800">1</td>
                                    <td className="p-2 text-right">$1.690</td>
                                    <td className="p-2 text-right font-bold text-slate-900">$1.690</td>
                                  </tr>
                                  <tr className="border-b border-slate-100">
                                    <td className="p-2 font-bold text-slate-800">Medias Pantalón Térmicas Plush <span className="text-[10px] text-slate-500 font-normal block">Talle: Único - Color: Piel</span></td>
                                    <td className="p-2 text-center text-slate-800">1</td>
                                    <td className="p-2 text-right">$800</td>
                                    <td className="p-2 text-right font-bold text-slate-900">$800</td>
                                  </tr>
                                </tbody>
                              </table>

                              {/* Pricing breakdown block */}
                              <div className="w-56 ml-auto border-t border-slate-200 pt-3 space-y-1.5 text-xs text-slate-600 font-medium">
                                <div className="flex justify-between">
                                  <span>Subtotal:</span>
                                  <span>UYU $2.490</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Envío:</span>
                                  <span className="text-emerald-500 font-bold font-mono">Gratis</span>
                                </div>
                                <div className="flex justify-between text-slate-900 font-extrabold border-t border-slate-200/70 pt-2 text-xs">
                                  <span>Total de la compra:</span>
                                  <span className="text-slate-900">UYU $2.490</span>
                                </div>
                              </div>

                              {/* Email Friendly Footer */}
                              <div className="border-t border-slate-100 pt-5 text-center text-[9px] text-slate-400 space-y-1">
                                <p>© {new Date().getFullYear()} {editingSettings.siteTitle || "Ventas Juem"}. Todos los derechos reservados.</p>
                                <p>Este mail fue enviado de forma automática por transacciones mercantiles habilitadas por el cliente.</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Email simulator / sent logs console */}
                    <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Database className="h-4 w-4 text-indigo-500" />
                            <span>Consola de Entrega & Historial ({emailLogs.length})</span>
                          </h3>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-500">
                            Registro de correos salientes salidos de la pasarela ecommerce en esta sesión.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={fetchEmailLogs}
                            disabled={emailLogsLoading}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-400 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer h-8"
                          >
                            <RefreshCw className={`h-3 w-3 ${emailLogsLoading ? "animate-spin" : ""}`} />
                            <span>Actualizar</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleClearEmailLogs}
                            disabled={emailLogs.length === 0}
                            className="p-1.5 bg-red-100 dark:bg-red-950/30 hover:bg-red-200 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer h-8"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Vaciar Historial</span>
                          </button>
                        </div>
                      </div>

                      {emailLogsLoading && emailLogs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                          <RefreshCw className="h-8 w-8 animate-spin text-indigo-500 mb-2" />
                          <span className="text-xs">Cargando bitácora de entrega...</span>
                        </div>
                      ) : emailLogs.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-slate-400">
                          <Mail className="h-8 w-8 mx-auto opacity-30 mb-2 text-indigo-500" />
                          <p className="text-xs font-medium">No se han originado entregas de correos automáticos todavía.</p>
                          <p className="text-[9px] text-slate-400 max-w-sm mx-auto mt-1">Realiza una compra de prueba en la tienda o actualiza un pedido en 'Ventas y Pedidos' para ver la simulación en tiempo real.</p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                          {emailLogs.map((log: any) => (
                            <div key={log.id} className="p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl space-y-2 text-left">
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                    log.status === "success" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400" :
                                    log.status === "simulated" ? "bg-sky-100 text-sky-800 dark:bg-sky-950/20 dark:text-sky-400" :
                                    log.status === "disabled" ? "bg-slate-200 text-slate-800 dark:bg-zinc-800 dark:text-zinc-400" :
                                    "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                                  }`}>
                                    {log.status === "success" ? "✓ SMTP ENVIADO" :
                                     log.status === "simulated" ? "★ SIMULADO" :
                                     log.status === "disabled" ? "✕ MUTED (DESACTIVADO)" :
                                     "✕ FALLIDO (ERROR)"}
                                  </span>
                                  <span className="text-slate-400 dark:text-zinc-500 font-mono text-[9px]">ID: {log.id}</span>
                                </div>
                                <span className="text-slate-400 dark:text-zinc-500 font-mono text-[9px]">
                                  {new Date(log.timestamp).toLocaleTimeString()} ({new Date(log.timestamp).toLocaleDateString()})
                                </span>
                              </div>

                              <div className="border-t border-slate-100 dark:border-zinc-900 pt-2 grid grid-cols-1 sm:grid-cols-2 gap-y-1 gap-x-3 text-xs text-slate-700 dark:text-zinc-300">
                                <div>
                                  <strong className="text-slate-400 dark:text-zinc-500">Para:</strong> {log.to}
                                </div>
                                <div className="truncate">
                                  <strong className="text-slate-400 dark:text-zinc-500">Asunto:</strong> {log.subject}
                                </div>
                              </div>

                              {log.error && (
                                <div className="p-2 bg-red-100/10 border border-red-100/20 rounded-lg text-[10px] text-red-500 font-mono">
                                  <strong>Error Interno SMTP:</strong> {log.error}
                                </div>
                              )}

                              {/* Preview expandable email content */}
                              <details className="text-[11px] text-indigo-500 cursor-pointer outline-none">
                                <summary className="font-semibold underline select-none text-[10px]">Ver contenido HTML del Correo</summary>
                                <div className="mt-2 bg-white text-zinc-950 p-4 rounded-lg border border-slate-200 shadow-inner max-h-[300px] overflow-y-auto">
                                  <div dangerouslySetInnerHTML={{ __html: log.body }} />
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION B: LIVE PREVIEW COLUMN - REMOVED AS REQUESTED BY USER */}
              {false && (
                <div className="hidden lg:flex lg:col-span-5 flex-col gap-3 sticky top-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Smartphone className="h-4 w-4" />
                    <span>{adminSection === "emails" ? "Vista Previa de Notificación" : "Vista Previa del Dispositivo"}</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 bg-indigo-600 text-white rounded-full font-mono font-bold uppercase animate-pulse">En vivo</span>
                </div>

                {adminSection === "emails" ? (
                  /* Simulated smartphone frame preview of emails */
                  <div className="w-full aspect-[4/5.5] bg-slate-50 dark:bg-zinc-950 rounded-3xl border-8 border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col scale-100 origin-top">
                    {/* Mock Status Bar */}
                    <div className="h-10 border-b border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between px-4 select-none">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">Email del Cliente</span>
                      </div>
                      <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200/40 dark:border-zinc-800 scale-90">
                        <button
                          type="button"
                          onClick={() => setEmailPreviewTab('created')}
                          className={`px-2 py-1 rounded-md text-[8px] font-extrabold uppercase tracking-wide transition cursor-pointer ${
                            emailPreviewTab === 'created'
                              ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          Pedido
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmailPreviewTab('changed')}
                          className={`px-2 py-1 rounded-md text-[8px] font-extrabold uppercase tracking-wide transition cursor-pointer ${
                            emailPreviewTab === 'changed'
                              ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
                          }`}
                        >
                          Estado
                        </button>
                      </div>
                    </div>

                    {/* Email content scrollable box */}
                    <div className="flex-1 overflow-y-auto p-3 bg-slate-100 dark:bg-zinc-950 text-left">
                      {/* Email Client Subject Header Card */}
                      <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 shadow-xs space-y-1 text-slate-600 dark:text-zinc-400 mb-3">
                        <div className="flex justify-between items-center text-[9px] pb-1 border-b border-slate-100 dark:border-zinc-800/50">
                          <span className="text-slate-400 font-semibold uppercase">De:</span>
                          <span className="font-bold text-slate-700 dark:text-zinc-200 truncate max-w-[160px]">
                            {editingSettings.emailSenderFromAddress || `${editingSettings.siteTitle || "Ventas Juem"} <no-reply@tienda.com>`}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1 text-[10px] pt-1">
                          <span className="text-slate-400 font-semibold uppercase text-[8px]">Asunto:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 transition-all duration-300 truncate max-w-[190px]">
                            {emailPreviewTab === 'created' ? (
                              editingSettings.emailTemplateOrderCreatedSubject ? (
                                editingSettings.emailTemplateOrderCreatedSubject
                                  .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                  .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                  .replace(/\{\{total\}\}/g, "UYU $2.490")
                                  .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                              ) : (
                                `¡Gracias por tu compra! Tu pedido #6C3AA2 ha sido recibido`
                              )
                            ) : (
                              editingSettings.emailTemplateOrderStatusChangedSubject ? (
                                editingSettings.emailTemplateOrderStatusChangedSubject
                                  .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                  .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                  .replace(/\{\{total\}\}/g, "UYU $2.490")
                                  .replace(/\{\{statusText\}\}/g, "Enviado 🚚")
                                  .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                              ) : (
                                `Actualización de tu pedido #6C3AA2 - Enviado 🚚`
                              )
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actual Client HTML Canvas */}
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm text-slate-800 text-[11px] leading-relaxed">
                        {/* Email Brand Header */}
                        {editingSettings.emailHeaderImageUrl ? (
                          <div className="border-b-2 border-amber-500 overflow-hidden bg-[#0c1221] relative animate-fade-in">
                            <img
                              src={editingSettings.emailHeaderImageUrl || "/src/assets/images/juem_email_banner_1781008874987.png"}
                              alt={editingSettings.siteTitle || "Header"}
                              className="w-full object-cover max-h-[140px]"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/src/assets/images/juem_email_banner_1781008874987.png";
                              }}
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/55 py-2 px-3 text-center backdrop-blur-xs">
                              <p className="m-0 text-white text-[9px] font-bold tracking-wide">
                                {emailPreviewTab === 'created' 
                                  ? "¡Tu compra ha sido aprobada con éxito! 🎉" 
                                  : "¡Novedades del envío de paquete! 🚚"
                                }
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-indigo-600 p-4 text-center text-white animate-fade-in">
                            {editingSettings.logoType === 'image' && !!editingSettings.logoImageUrl ? (
                              <div className="mb-2 flex justify-center">
                                <img 
                                  src={editingSettings.logoImageUrl || null} 
                                  alt={editingSettings.siteTitle || "Logo"} 
                                  className="max-h-12 max-w-[150px] object-contain rounded-lg bg-white/15 p-1"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : (
                              <h1 className="m-0 text-xs font-extrabold tracking-tight">
                                {editingSettings.siteTitle || "Ventas Juem"}
                              </h1>
                            )}
                            <p className="mt-1 text-[8px] opacity-90 leading-tight">
                              {emailPreviewTab === 'created' 
                                ? "¡Tu compra ha sido aprobada con éxito! 🎉" 
                                : "¡Novedades del envío de paquete! 🚚"
                              }
                            </p>
                          </div>
                        )}

                        {/* Layout details padding */}
                        <div className="p-3.5 space-y-3">
                          <h2 className="text-[11px] font-extrabold text-slate-900">¡Hola, Christian Olivera!</h2>
                          
                          <p className="text-slate-600 text-[9.5px] leading-relaxed whitespace-pre-wrap">
                            {emailPreviewTab === 'created' ? (
                              editingSettings.emailTemplateOrderCreatedBody ? (
                                editingSettings.emailTemplateOrderCreatedBody
                                  .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                  .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                  .replace(/\{\{total\}\}/g, "UYU $2.490")
                                  .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                              ) : (
                                "Muchas gracias por realizar tu compra con nosotros. Tu pago ha sido aprobado correctamente y tu pedido ya está siendo preparado para entrega. Aquí tienes los detalles completos de tu compra:"
                              )
                            ) : (
                              editingSettings.emailTemplateOrderStatusChangedBody ? (
                                editingSettings.emailTemplateOrderStatusChangedBody
                                  .replace(/\{\{orderId\}\}/g, "6C3AA2")
                                  .replace(/\{\{customerName\}\}/g, "Christian Olivera")
                                  .replace(/\{\{total\}\}/g, "UYU $2.490")
                                  .replace(/\{\{statusText\}\}/g, "Enviado 🚚")
                                  .replace(/\{\{siteTitle\}\}/g, editingSettings.siteTitle || "Ventas Juem")
                              ) : (
                                "Te notificamos que el estado de tu pedido #6C3AA2 ha sido actualizado por nuestro equipo de logística."
                              )
                            )}
                          </p>

                          {/* Order metadata tag box */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-[9px] text-slate-600">
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                              <span className="text-slate-400 font-semibold">Número de Pedido:</span>
                              <span className="font-mono font-bold text-indigo-600">#6C3AA2</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                              <span className="text-slate-400 font-semibold">Fecha de Compra:</span>
                              <span className="text-slate-800 font-medium font-mono">08/06/2026 20:06</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 font-semibold">Método de Pago:</span>
                              <span className="text-slate-800 font-bold">Mercado Pago Uruguay</span>
                            </div>
                          </div>

                          {/* Shipment Alert Badge */}
                          {emailPreviewTab === 'changed' && (
                            <div className="border border-indigo-100 rounded-xl bg-indigo-50/40 p-2 text-center space-y-0.5">
                              <span className="text-[7.5px] uppercase font-bold tracking-widest text-indigo-600 block">Nuevo Estado de Preparación</span>
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[9.5px] font-extrabold text-slate-800 font-mono">Despachado / Enviado 🚚</span>
                              </div>
                            </div>
                          )}

                          {/* Details headers */}
                          <div className="border-b border-slate-200 pb-1">
                            <span className="text-[8px] uppercase tracking-widest font-extrabold text-slate-400">Detalle de Productos</span>
                          </div>

                          {/* Table details */}
                          <table className="w-full text-[9px] text-left text-slate-600 border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[8px] font-bold text-slate-400 uppercase">
                                <th className="p-1">Artículo</th>
                                <th className="p-1 text-center w-8">Cant.</th>
                                <th className="p-1 text-right w-14">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-100">
                                <td className="p-1 font-bold text-slate-800 text-[9px]">Poncho Buzo Pijama <span className="text-[8px] text-slate-500 font-normal block">M - Azul Marino</span></td>
                                <td className="p-1 text-center font-mono">1</td>
                                <td className="p-1 text-right font-mono">$1.690</td>
                              </tr>
                              <tr className="border-b border-slate-100">
                                <td className="p-1 font-bold text-slate-800 text-[9px]">Medias Pantalón Plush <span className="text-[8px] text-slate-500 font-normal block">Único - Piel</span></td>
                                <td className="p-1 text-center font-mono">1</td>
                                <td className="p-1 text-right font-mono">$800</td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Price break */}
                          <div className="w-28 ml-auto pt-1 space-y-1 text-[9px] text-slate-600 font-medium">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span className="font-mono">UYU $2.490</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Envío:</span>
                              <span className="text-emerald-500 font-bold font-mono">Gratis</span>
                            </div>
                            <div className="flex justify-between text-slate-950 font-extrabold border-t border-slate-200/50 pt-1 text-[10px]">
                              <span>Total:</span>
                              <span className="font-mono">UYU $2.490</span>
                            </div>
                          </div>

                          {/* Bottom tag block */}
                          <div className="border-t border-slate-100 pt-2 text-center text-[7.5px] text-slate-400 space-y-0.5">
                            <p>© {new Date().getFullYear()} {editingSettings.siteTitle || "Ventas Juem"}.</p>
                            <p>E-mail automático transaccional.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Simulated frame preview of store */
                  <div className="w-full aspect-[4/5] bg-zinc-950 rounded-3xl border-8 border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col scale-100 origin-top">
                    
                    {/* Mockup Store Header */}
                    <div className="h-11 border-b border-zinc-900 flex items-center justify-between px-3 bg-zinc-900/60 select-none">
                      <div className="text-white font-extrabold italic text-xs tracking-tight">{editingSettings.siteTitle}</div>
                      <div className="flex gap-2 text-zinc-500 text-[9px] font-semibold">
                        <span>Catálogo</span>
                        <span className="theme-text-primary">Cart (1)</span>
                      </div>
                    </div>

                    {/* Mockup visual representation in mini card */}
                    <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-zinc-950 text-white flex flex-col justify-between">
                      <div>
                        {/* Banner teaser */}
                        <div className="relative h-20 rounded-lg overflow-hidden bg-zinc-900 mb-2">
                          <img
                            src={editingSettings.bannerImageUrl || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=600&q=80"}
                            alt="preview mini layout"
                            className="w-full h-full object-cover opacity-50"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent"></div>
                          <div className="absolute bottom-1.5 left-2">
                            <h4 className="text-[10px] font-bold text-white line-clamp-1">{editingSettings.bannerTitle}</h4>
                            <span className="text-[8px] text-zinc-400 font-light block line-clamp-1">{editingSettings.bannerSubtitle}</span>
                          </div>
                        </div>

                        {/* Item representation */}
                        {adminSection === "products" && editingProduct ? (
                          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                            <img
                              src={editingProduct.imageUrl || UNSPLASH_TEMPLATES[0].url}
                              alt="editing preview"
                              className="w-full h-24 object-cover rounded-md"
                            />
                            <div>
                              <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">{editingProduct.category || "Categoría"}</span>
                              <h5 className="text-[11px] font-bold line-clamp-1 text-zinc-100">{editingProduct.name || "Sin título"}</h5>
                              <div className="flex items-baseline gap-1.5 mt-1">
                                <span className="text-[12px] font-mono font-black text-indigo-400">${Number(editingProduct.price || 0).toFixed(2)}</span>
                                {editingProduct.originalPrice && (
                                  <span className="text-[8px] text-zinc-500 line-through">${Number(editingProduct.originalPrice).toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                            <img
                              src="https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"
                              alt="editing preview item 1"
                              className="w-full h-24 object-cover rounded-md"
                            />
                            <div>
                              <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Moda / Calidad</span>
                              <h5 className="text-[11px] font-bold line-clamp-1 text-zinc-100">Chaqueta Bomber Premium</h5>
                              <span className="text-[12px] font-mono font-black text-indigo-400">$89.99</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer query tool */}
                      <div className="space-y-1.5 mt-auto">
                        <div className="w-full py-1.5 bg-indigo-600 text-white font-extrabold text-center rounded text-[10px] uppercase">Añadir al Carrito</div>
                        <div className="w-full py-1.5 bg-[#25D366] text-white font-bold text-center rounded text-[9px] uppercase flex items-center justify-center gap-1 select-none">
                          <MessageCircle className="w-3.5 h-3.5 fill-current" />
                          Averiguar por WhatsApp
                        </div>
                      </div>
                    </div>

                    {/* Watermark badge rotate 45 degrees */}
                    <div className="absolute top-1/2 left-0 right-0 py-1 bg-indigo-600 text-white text-[8px] text-center uppercase tracking-widest font-black rotate-[-35deg] opacity-20 pointer-events-none">
                      Preview de Diseñador
                    </div>
                  </div>
                )}
              </div>
              )}
              </div>
            )}
          </main>

          {/* Persistent AI Assistant Sidebar */}
          <AnimatePresence>
            {showAIAssistantSidebar && (
              <motion.aside
                initial={{ opacity: 0, x: 340 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 340 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 h-full w-full md:w-[340px] border-l border-zinc-800 bg-zinc-950 flex flex-col z-[50] shadow-2xl"
              >
                <AIAssistant
                  store={store}
                  showToast={(msg, type) => {
                    const adminType = type === "error" ? "error" : type === "success" ? "success" : "neutral";
                    showAdminToast(msg, adminType);
                  }}
                  onClose={() => setShowAIAssistantSidebar(false)}
                  adminSection={adminSection}
                  onEditProduct={(p) => {
                    setAdminSection("products");
                    setEditingProduct(prepareProductForEditing(p));
                    setEditingProductStep(1);
                    setIsNewProductMode(false);
                    showAdminToast(`Editando producto: ${p.name}`, "neutral");
                  }}
                />
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Persistent minimized floating button (When collapsed, don't lose history, click to re-open) */}
          <AnimatePresence>
            {!showAIAssistantSidebar && (
              <motion.button
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                onClick={() => {
                  setShowAIAssistantSidebar(true);
                  showAdminToast("Abriendo Copilot JUEM...", "neutral");
                }}
                className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-full shadow-2xl border border-indigo-400/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer group"
                title="Abrir Copilot JUEM"
              >
                <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
                <span className="text-xs font-bold pr-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap">
                  Copilot JUEM
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* RENDER MODAL SECURE LOGIN FOR ADMIN */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-center relative shadow-2xl">
            <h3 className="text-xl font-bold mb-1 tracking-tight text-white flex items-center justify-center gap-2">
              <Settings className="h-5 w-5 text-blue-500" />
              <span>Gestión de Tienda</span>
            </h3>
            <p className="text-zinc-400 text-xs mb-6">Inicia sesión de administrador con tus credenciales seguras de sincronización.</p>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Nombre de Usuario</label>
                <input
                  required
                  type="text"
                  placeholder="ej. Juem"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-zinc-700"
                />
              </div>

              <div className="text-left space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500">Contraseña Segura</label>
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-zinc-700"
                />
              </div>

              {loginError && (
                <p className="text-xs text-red-400 text-center font-semibold">❌ {loginError}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 px-4 theme-btn-primary rounded-xl text-xs font-bold tracking-wider uppercase mt-2 shadow-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Sincronizar Panel</span>
              </button>
            </form>

            <button
              onClick={() => {
                setIsLoginModalOpen(false);
                setLoginError("");
              }}
              className="mt-4 text-xs text-zinc-500 hover:text-zinc-300 underline"
            >
              Cerrar y volver a Tienda
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer element */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        settings={store.settings}
        onClearCart={handleClearCart}
        coupons={store.coupons}
        onProceedToCheckout={() => setActiveTab("checkout")}
      />

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs md:hidden"
            />

            {/* Slide-out Menu Panel */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-sm h-full flex flex-col p-6 shadow-2xl border-r border-[#D4A55A]/15 md:hidden overflow-y-auto scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden bg-[#050B1A] text-[#F4EAD7]"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#D4A55A]/15">
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setActiveTab("storefront");
                    navigateToProductRoute("todos", "all");
                    setSearchQuery("");
                    setIsHeaderSearchOpen(false);
                    setIsMobileMenuOpen(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="flex items-center gap-2 cursor-pointer select-none border-none bg-transparent text-left outline-none p-0 animate-none"
                >
                  {store.settings.logoType === "image" && !!store.settings.logoImageUrl ? (
                    <img
                      src={store.settings.logoImageUrl}
                      alt={store.settings.siteTitle}
                      className="w-8 h-8 rounded-xl object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-[#D4A55A] rounded-xl flex items-center justify-center text-[#050B1A] font-bold text-lg shadow-sm">
                      {store.settings.logoText || "J"}
                    </div>
                  )}
                  <span className="font-bold text-base tracking-tight font-serif text-[#F4EAD7]">{store.settings.siteTitle}</span>
                </button>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl transition cursor-pointer hover:bg-[#0B1730] text-[#E6BF76] hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Categories Navigation Block */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-[#D4A55A]/80 mb-3">
                    Explorar Categorías
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {/* All Catalog option */}
                    <button
                      onClick={() => {
                        navigateToProductRoute("todos", "all", true);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedCategory === "todos"
                          ? "bg-[#D4A55A] text-[#050B1A]"
                          : "bg-[#0B1730]/65 text-[#F4EAD7] hover:bg-[#0B1730] border border-[#D4A55A]/10 hover:border-[#D4A55A]/40 hover:text-[#E6BF76]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Grid className="h-4 w-4" />
                        <span>Ver todo el catálogo</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                    </button>

                    {/* Main Categories list */}
                    {(store.dbCategories || [])
                      .filter(c => c.active !== false)
                      .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                      .map((catObj) => {
                        const isCatActive = selectedCategory === catObj.nombre;
                        const dbSubs = (store.dbSubcategories || []).filter(sub => sub.categoria_id === catObj.id && sub.active !== false);
                        
                        return (
                          <div key={catObj.id} className="space-y-1">
                            <button
                              onClick={() => {
                                navigateToProductRoute(catObj.id, "all");
                                setIsMobileMenuOpen(false);
                              }}
                              className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                isCatActive
                                  ? "bg-[#D4A55A]/20 text-[#E6BF76] border border-[#D4A55A]/45"
                                  : "hover:bg-[#0B1730] text-[#F4EAD7]/80 hover:text-[#E6BF76] border border-transparent hover:border-[#D4A55A]/25"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="[&_svg]:h-4 [&_svg]:w-4 opacity-70">
                                  {getCategoryIcon(catObj.icono || catObj.nombre)}
                                </span>
                                <span>{catObj.nombre}</span>
                              </div>
                              <ChevronRight className="h-3.5 w-3.5 opacity-40" />
                            </button>

                            {/* Mobile nested Subcategories */}
                            {dbSubs.length > 0 && (
                              <div className="pl-6 border-l border-[#D4A55A]/20 ml-5 py-0.5 space-y-1">
                                {dbSubs.map((sub) => {
                                  const isSubActive = isCatActive && selectedSubcategory === sub.id;
                                  return (
                                    <button
                                      key={sub.id}
                                      onClick={() => {
                                        navigateToProductRoute(catObj.id, sub.id);
                                        setIsMobileMenuOpen(false);
                                      }}
                                      className={`w-full text-left py-1.5 px-2 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
                                        isSubActive
                                          ? "text-[#E6BF76] font-bold"
                                          : "text-zinc-400 hover:text-[#E6BF76]"
                                      }`}
                                    >
                                      • {sub.nombre}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Mobile Admin panel shortcut triggers */}
                <div>
                  <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-3">
                    Herramientas de Cuenta
                  </h3>
                  <div className="flex flex-col gap-1.5">
                    {authToken ? (
                      <>
                        <button
                          onClick={() => {
                            setActiveTab("admin");
                            window.history.pushState(null, "", `/admin/${adminSection}`);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            activeTab === "admin"
                              ? "bg-indigo-600/20 text-indigo-400"
                              : store.settings.themeMode === "dark"
                              ? "bg-zinc-900/40 text-zinc-300 hover:bg-zinc-900"
                              : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <Settings className="h-4 w-4 text-indigo-400" />
                          <span>Panel de Control Admin</span>
                        </button>
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 hover:bg-red-500/15 transition-colors cursor-pointer animate-fade-in"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Cerrar Sesión</span>
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 text-center text-[10px] space-y-1.5">
                {!authToken && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsLoginModalOpen(true);
                    }}
                    className="text-zinc-500 dark:text-zinc-500 hover:underline text-[10px] font-semibold tracking-wide cursor-pointer transition select-none"
                  >
                    🔐 Acceso Administrativo
                  </button>
                )}
                <p className="opacity-60">&copy; 2026 {store.settings.siteTitle}</p>
                <p className="opacity-40 text-[9px] mt-0.5">Tienda Virtual Optimizada</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>



      {/* Elegantes Alertas y Confirmaciones Personalizadas (Elimina bloqueos de iframe/sandboxing de alert/confirm) */}
      {customAlert && customAlert.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-150">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-amber-500">
              <span className="p-2 bg-amber-500/10 rounded-lg">
                <AlertCircle className="h-5 w-5" />
              </span>
              <h4 className="font-bold text-sm text-slate-950 dark:text-white uppercase tracking-wider">{customAlert.title}</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-semibold">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert(null)}
              className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-white font-bold rounded-lg text-xs transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {customConfirm && customConfirm.show && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in animate-duration-150">
          <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-zinc-800 dark:text-white">
              <span className="p-2 bg-neutral-500/10 rounded-lg">
                <HelpCircle className="h-5 w-5 text-blue-500" />
              </span>
              <h4 className="font-bold text-sm text-slate-950 dark:text-white uppercase tracking-wider">{customConfirm.title}</h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-semibold">{customConfirm.message}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setCustomConfirm(null)}
                className="flex-1 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-slate-800 dark:text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  customConfirm.onConfirm();
                  setCustomConfirm(null);
                }}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón Flotante de WhatsApp - Siempre Visible en Storefront */}
      {activeTab === "storefront" && (
        <WhatsAppWidget
          whatsappNumber={store.settings.whatsappNumber}
          siteTitle={store.settings.siteTitle}
        />
      )}

      <AnimatePresence>
        {adminToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed bottom-24 right-6 z-[99999] p-4 rounded-xl shadow-2xl border flex items-center gap-3 bg-white/95 dark:bg-zinc-950/95 ${
              adminToast.type === "success"
                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : adminToast.type === "error"
                ? "border-rose-500/30 text-rose-600 dark:text-rose-400"
                : "border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}
          >
            <span className={`p-1 px-1.5 rounded font-bold text-xs ${
              adminToast.type === "success"
                ? "bg-emerald-500/10 text-emerald-500"
                : adminToast.type === "error"
                ? "bg-rose-500/10 text-rose-500"
                : "bg-amber-500/10 text-amber-500"
            }`}>
              {adminToast.type === "success" ? "✓" : adminToast.type === "error" ? "✗" : "⚠"}
            </span>
            <span className="font-semibold text-xs">{adminToast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AddToCartModal
        isOpen={addedItemModal?.isOpen ?? false}
        onClose={() => setAddedItemModal(null)}
        onGoToCheckout={() => {
          setAddedItemModal(null);
          setActiveTab("checkout");
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        product={addedItemModal?.product ?? null}
        quantity={addedItemModal?.quantity ?? 1}
        selectedSize={addedItemModal?.size}
        selectedColor={addedItemModal?.color}
        themeMode={store.settings.themeMode}
        allProducts={store.products}
        onAddCrossSell={handleAddToCart}
      />

      {/* Barra de Navegación Inferior Flotante - Ultra Optimizada para Celulares */}
      {activeTab === "storefront" && (
        <div id="mobile-bottom-nav" className="fixed bottom-0 left-0 right-0 z-40 bg-[#050B1A]/95 border-t border-[#D4A55A]/30 backdrop-blur-md py-2 px-3 flex items-center justify-between lg:hidden shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
          {/* Volver a la Web Principal */}
          <button
            onClick={() => {
              setSelectedProduct(null);
              setActiveTab("storefront");
              navigateToProductRoute("todos", "all");
              setSearchQuery("");
              setIsHeaderSearchOpen(false);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
            title="Volver a la Web Principal"
          >
            <Home className="h-4.5 w-4.5 text-[#E6BF76]/90" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#F4EAD7]/75">Inicio</span>
          </button>

          {/* Buscador Rápido de Productos */}
          <button
            onClick={() => {
              setIsHeaderSearchOpen(true);
              setTimeout(() => {
                document.getElementById("header-search-input")?.focus();
              }, 150);
              const el = document.getElementById("catalog-view");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
            title="Buscar"
          >
            <Search className="h-4.5 w-4.5 text-zinc-305" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Buscar</span>
          </button>

          {/* Selector de Categorías (Abre el Menú Lateral) */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
            title="Abrir Menú"
          >
            <Menu className="h-4.5 w-4.5 text-[#E6BF76]" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Menú</span>
          </button>

          {/* Consulta Directa por WhatsApp */}
          <button
            onClick={() => {
              const cleanPhone = store.settings.whatsappNumber.replace(/[^0-9]/g, "");
              window.open(`https://wa.me/${cleanPhone}?text=¡Hola!%20Vengo%20desde%20la%20tienda%20online%20de%20Juem%20y%2520quería%2520hacer%2520una%2520consulta.`, "_blank", "noopener,noreferrer");
            }}
            className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0"
            title="Soporte WhatsApp"
          >
            <MessageCircle className="h-4.5 w-4.5 text-emerald-400" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Consulta</span>
          </button>

          {/* Mi Carrito de Compras */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 text-center transition text-zinc-400 active:text-[#E6BF76] active:scale-95 cursor-pointer flex-grow basis-0 relative"
            title="Mi Carrito"
          >
            <div className="relative">
              <ShoppingBag className="h-4.5 w-4.5 text-[#E6BF76]" />
              {cart.reduce((sum, item) => sum + item.quantity, 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-[8px] text-white font-black px-1 rounded-full leading-none flex items-center justify-center animate-bounce min-w-[13px] h-[13px]">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400">Carrito</span>
          </button>
        </div>
      )}

    </div>
  );
}
