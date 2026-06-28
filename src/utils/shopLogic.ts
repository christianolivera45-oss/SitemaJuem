import { CartItem, Coupon, Product, ProductVariant } from "../types";

/**
 * Resolves the individual price of a cart item based on standard base price or variant overrides.
 */
export function getItemPrice(item: CartItem): number {
  if (!item || !item.product) return 0;
  
  const p = item.product;
  if (p.variants && p.variants.length > 0 && item.selectedSize) {
    const exactMatch = item.selectedColor 
      ? p.variants.find(v => v.size === item.selectedSize && v.color === item.selectedColor)
      : null;
    const sizeMatch = p.variants.find(v => v.size === item.selectedSize);
    const match = exactMatch || sizeMatch;
    
    if (match) {
      if (typeof match.price === "number" && match.price > 0) {
        return match.price;
      }
      if (typeof match.priceDelta === "number" && match.priceDelta !== 0) {
        return p.price + match.priceDelta;
      }
    }
  }
  return p.price;
}

/**
 * Calculates the grand subtotal of all items in the cart.
 */
export function calculateSubtotal(cartItems: CartItem[]): number {
  if (!cartItems || cartItems.length === 0) return 0;
  return cartItems.reduce((acc, item) => {
    const unitPrice = getItemPrice(item);
    const qty = Math.max(1, item.quantity || 1);
    return acc + (unitPrice * qty);
  }, 0);
}

/**
 * Validates a coupon code server or client side against active and expiration rules.
 */
export function validateCoupon(
  couponCode: string, 
  coupons?: Coupon[], 
  referenceDate: Date = new Date()
): { success: boolean; discountPercent: number; message: string } {
  if (!couponCode || !couponCode.trim()) {
    return { success: false, discountPercent: 0, message: "Código de cupón vacío." };
  }
  
  if (!coupons || coupons.length === 0) {
    return { success: false, discountPercent: 0, message: "No hay cupones promocionales configurados en el sistema." };
  }

  const cleanPromo = couponCode.trim().toUpperCase();
  const matchedCoupon = coupons.find(
    (c) => c.code.toUpperCase() === cleanPromo && c.active !== false
  );

  if (!matchedCoupon) {
    return { success: false, discountPercent: 0, message: "El código ingresado no existe o no es válido actualmente." };
  }

  if (matchedCoupon.expiration_date) {
    const expDate = new Date(matchedCoupon.expiration_date);
    if (expDate <= referenceDate) {
      return { success: false, discountPercent: 0, message: "Este cupón ha expirado." };
    }
  }

  return { 
    success: true, 
    discountPercent: Number(matchedCoupon.discount_percent || 0), 
    message: `¡Cupón verificado! Descuento de ${matchedCoupon.discount_percent}%` 
  };
}

/**
 * Calculates discount amount matching shop round-to-nearest integer convention.
 */
export function calculateDiscount(subtotal: number, discountPercent: number): number {
  if (subtotal <= 0 || discountPercent <= 0) return 0;
  return Math.round((subtotal * discountPercent) / 100);
}

/**
 * Calculations of final total including subtotal, discounts, and shipping cost.
 */
export function calculateTotal(subtotal: number, discountAmount: number, shippingCost: number): number {
  const result = subtotal - (discountAmount || 0) + (shippingCost || 0);
  return Math.max(0, result);
}

/**
 * Sanitizes fields to defend against XSS code injections.
 */
export function sanitizeField(str: string): string {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Form / checkout field validation checker (Email, names, phones).
 */
export function validateFormFields(
  name: string, 
  email: string, 
  phone: string
): { success: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const cleanName = (name || "").trim();
  if (!cleanName) {
    errors.push("El nombre es requerido.");
  } else if (cleanName.length < 3) {
    errors.push("El nombre completo debe tener al menos 3 caracteres.");
  }

  const cleanEmail = (email || "").trim();
  if (!cleanEmail) {
    errors.push("El correo electrónico es requerido.");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      errors.push("El formato del correo electrónico ingresado no es válido.");
    }
  }

  const cleanPhone = (phone || "").trim();
  if (cleanPhone) {
    const cleanDigits = cleanPhone.replace(/\D/g, "");
    if (cleanDigits.length < 6) {
      errors.push("El número de teléfono debe tener al menos 6 dígitos válidos.");
    }
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Stock availability check and allocation deduction simulator.
 */
export function simulateStockAllocation(
  requestedQty: number,
  availableStock: number
): { success: boolean; allocatedQty: number; remainingStock: number; message: string } {
  if (requestedQty <= 0) {
    return { success: false, allocatedQty: 0, remainingStock: availableStock, message: "La cantidad solicitada debe ser de al menos 1 unidad." };
  }

  if (availableStock <= 0) {
    return { success: false, allocatedQty: 0, remainingStock: 0, message: "Sin stock disponible." };
  }

  if (requestedQty > availableStock) {
    return { 
      success: false, 
      allocatedQty: availableStock, 
      remainingStock: 0, 
      message: `Solo hay ${availableStock} unidades disponibles en stock.` 
    };
  }

  return {
    success: true,
    allocatedQty: requestedQty,
    remainingStock: availableStock - requestedQty,
    message: "Reserva de stock procesada con éxito."
  };
}
