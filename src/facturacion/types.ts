/**
 * Tipos y enumerados oficiales de Facturación Electrónica para Uruguay (DGI - Dirección General de Impositiva).
 * Diseñado bajo un enfoque desacoplado y preparado para futura activación.
 */

/**
 * Códigos oficiales de Comprobantes Fiscales Electrónicos (CFE) según DGI Uruguay
 */
export enum TipoComprobanteDGI {
  E_FACTURA = 101,
  E_TICKET = 111,
  E_TICKET_NOTA_CREDITO = 112,
  E_FACTURA_NOTA_CREDITO = 102,
  E_TICKET_NOTA_DEBITO = 113,
  E_FACTURA_NOTA_DEBITO = 103,
  E_FACTURA_EXPORTACION = 121,
  E_TICKET_EXPORTACION = 122,
  E_REMITO = 181,
  E_RESGUARDO = 182
}

/**
 * Nombre descriptivo de los comprobantes fiscales
 */
export const TipoComprobanteLabels: Record<TipoComprobanteDGI, string> = {
  [TipoComprobanteDGI.E_FACTURA]: "e-Factura",
  [TipoComprobanteDGI.E_TICKET]: "e-Ticket",
  [TipoComprobanteDGI.E_TICKET_NOTA_CREDITO]: "e-Ticket Nota de Crédito",
  [TipoComprobanteDGI.E_FACTURA_NOTA_CREDITO]: "e-Factura Nota de Crédito",
  [TipoComprobanteDGI.E_TICKET_NOTA_DEBITO]: "e-Ticket Nota de Débito",
  [TipoComprobanteDGI.E_FACTURA_NOTA_DEBITO]: "e-Factura Nota de Débito",
  [TipoComprobanteDGI.E_FACTURA_EXPORTACION]: "e-Factura de Exportación",
  [TipoComprobanteDGI.E_TICKET_EXPORTACION]: "e-Ticket de Exportación",
  [TipoComprobanteDGI.E_REMITO]: "e-Remito",
  [TipoComprobanteDGI.E_RESGUARDO]: "e-Resguardo"
};

/**
 * Tipo de documento de la contraparte (Receptor del CFE)
 */
export enum TipoDocumentoReceptor {
  RUT = "RUT", // Registro Único de Tributos (Uruguay)
  CI = "CI",   // Cédula de Identidad (Uruguay)
  PASAPORTE = "Pasaporte",
  DNI = "DNI", // Documento extranjero
  NIE = "NIE", // Número de Identificación Extranjero
  OTROS = "Otros"
}

/**
 * Estados del flujo de un comprobante electrónico con la DGI / Servidor de Firma
 */
export enum EstadoEnvioDGI {
  PENDIENTE_ACTIVACION = "Pendiente de activación",
  PENDIENTE_FIRMA = "Pendiente de firma",
  PENDIENTE_ENVIO = "Pendiente de envío a DGI",
  APROBADO = "Aprobado por DGI",
  RECHAZADO = "Rechazado por DGI",
  PROCESANDO = "En proceso en pasarela",
  ERROR_CONEXION = "Error de comunicación con Pasarela"
}

/**
 * Constancia de Autorización de Emisión (CAE) otorgada por la DGI
 */
export interface ConstanciaAutorizacionEmision {
  caeNumero: string;             // Número único de autorización otorgado por DGI
  rangoDesde: number;            // Comienzo del rango habilitado
  rangoHasta: number;            // Fin del rango habilitado
  fechaVencimiento: string;      // Fecha límite para emitir comprobantes
}

/**
 * Estructura de un Comprobante Fiscal Electrónico (CFE)
 */
export interface ComprobanteFiscalElectronico {
  id?: number;
  ventaId?: number | null;            // Venta interna del sistema asociada a este comprobante
  tipoComprobante: TipoComprobanteDGI;
  serie: string;                      // Serie del comprobante (ej: "A", "B")
  numero: number;                     // Número secuencial emitido
  fechaEmision: string;               // Fecha en la que se confecciona el CFE
  
  // Datos del Emisor (JUEM)
  emisorRUT: string;                  // RUT de la empresa emisora
  emisorNombre: string;               // Nombre fantasía de la empresa emisora
  
  // Datos del Receptor (Cliente)
  receptorNombre: string;
  receptorDocumentoTipo: TipoDocumentoReceptor;
  receptorDocumentoNumero: string;    // RUT o Cédula
  receptorDireccion?: string;
  receptorCiudad?: string;
  receptorDepartamento?: string;
  
  // Datos Impositivos y Totales (Expresados en pesos uruguayos $ o dólares US$)
  moneda: "UYU" | "USD";
  montoNetoNoGravado: number;         // Monto exento de IVA (Tasa Min = 0%)
  montoNetoMinimo: number;            // Monto gravado a Tasa Mínima (10% IVA)
  montoNetoBasico: number;            // Monto gravado a Tasa Básica (22% IVA)
  montoIVAMinimo: number;             // Total del IVA al 10%
  montoIVABasico: number;             // Total del IVA al 22%
  montoTotal: number;                 // Suma total del comprobante
  
  // Datos de control DGI
  cae: ConstanciaAutorizacionEmision;
  estadoEnvio: EstadoEnvioDGI;
  fechaAutorizacion?: string;         // Fecha en la que DGI o el proveedor firmante aprueba el envío
  xmlFirmadoUrl?: string;             // Ruta de almacenamiento del XML firmado devuelto
  qrCodiguera?: string;               // Información textual para el código QR
  dgiGlosaString?: string;            // Detalle o descripción para mostrar en la impresión
  hashSeguridad?: string;             // Hash de seguridad
}

/**
 * Firma o contrato del Proveedor de Firma / Pasarela DGI
 * Permite cambiar de proveedor (UruFac, Memory, Infonet, etc.) sin cambiar la lógica del sistema.
 */
export interface IProveedorFacturacionPasarela {
  obtenerCAE(tipo: TipoComprobanteDGI): Promise<ConstanciaAutorizacionEmision>;
  firmarYEnviarCFE(cfe: ComprobanteFiscalElectronico): Promise<{
    estado: EstadoEnvioDGI;
    numeroAsignado: number;
    serieAsignada: string;
    caeUtilizado: ConstanciaAutorizacionEmision;
    fechaAutorizacion?: string;
    xmlFirmado?: string;
    qrString?: string;
    hashSeguridad?: string;
    errorDGI?: string;
  }>;
  consultarEstadoCFE(serie: string, numero: number, tipo: TipoComprobanteDGI): Promise<EstadoEnvioDGI>;
}

/**
 * Configuración del módulo de Facturación Electrónica Juem
 */
export interface ConfigFacturacionElectronica {
  activo: boolean; // Flag maestro para activar/desactivar la facturación electrónica DGI
  proveedorActual: string; // Nombre del proveedor seleccionado
  rutEmisor: string; // RUT de Juem
  razonSocialEmisor: string; // Razón social de Juem
  endpointApi: string; // API URL de la pasarela de facturación
  tokenAcceso: string; // Claves de autenticación
  ambiente: "HOMOLOGACION" | "PRODUCCION"; // Switch de entorno de pruebas/producción
}
