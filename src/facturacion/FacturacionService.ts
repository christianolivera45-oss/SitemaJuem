import { 
  TipoComprobanteDGI, 
  TipoDocumentoReceptor, 
  EstadoEnvioDGI, 
  ComprobanteFiscalElectronico, 
  IProveedorFacturacionPasarela, 
  ConstanciaAutorizacionEmision,
  ConfigFacturacionElectronica
} from "./types";

/**
 * ==============================================================================================
 * GUÍA DE ACTUACIÓN - INTEGRACIÓN FUTURA DE FACTURACIÓN ELECTRÓNICA JUEM (DGI URUGUAY)
 * ==============================================================================================
 * Este servicio representa la capa de acoplamiento débil (Decoupled Layer).
 * Actualmente el flag maestro `ACTIVO` se encuentra en FALSE (Pendiente de Activación).
 * 
 * PROCEDIMIENTO PARA ACTIVACIÓN EN PRODUCCIÓN:
 * 1. Modificar `MASTER_CONFIG.activo` a `true` o inyectar la variable de entorno `VITE_DGI_ACTIVO=true`.
 * 2. Implementar un `ProveedorPasarelaReal` que implemente la interfaz `IProveedorFacturacionPasarela`.
 *    - Este adaptador debe convertir las clases del dominio en el formato JSON/XML requerido 
 *      por el proveedor contratado (ejemplo: UruFac, Infonet, Memory, Abitab, etc.).
 * 3. Enviar el JSON al endpoint de homologación/producción del proveedor.
 * 4. Actualizar el estado de envío y almacenar el número de CFE devuelto y la firma XML/Hash en la DB.
 * ==============================================================================================
 */

export const MASTER_CONFIG: ConfigFacturacionElectronica = {
  activo: false, // MANDATORIO: Dejar desactivado para cumplimiento de las directivas actuales.
  proveedorActual: "MockProveedorPasarela", // Proveedor candidato a integrar
  rutEmisor: "219999990018", // RUT de prueba por defecto para homologación
  razonSocialEmisor: "SISTEMA DE FACTURACION JUEM S.R.L.",
  endpointApi: "https://api.urufac.com.uy/v1/cfe", // Ruta API candidata
  tokenAcceso: "TOKEN_SECRET_DGI_HOLDER",
  ambiente: "HOMOLOGACION"
};

/**
 * MOCK PROVIDER ADAPTER (Proveedor de fachada para simulación)
 * Cumple con la firma desacoplada pero no realiza llamadas reales.
 */
export class MockProveedorPasarela implements IProveedorFacturacionPasarela {
  async obtenerCAE(tipo: TipoComprobanteDGI): Promise<ConstanciaAutorizacionEmision> {
    console.log(`[FacturacionService - Mock] Obteniendo CAE de pruebas para tipo: ${tipo}`);
    return {
      caeNumero: "990012345678",
      rangoDesde: 1,
      rangoHasta: 10000,
      fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 año de vigencia
    };
  }

  async firmarYEnviarCFE(cfe: ComprobanteFiscalElectronico): Promise<{
    estado: EstadoEnvioDGI;
    numeroAsignado: number;
    serieAsignada: string;
    caeUtilizado: ConstanciaAutorizacionEmision;
    fechaAutorizacion?: string;
    xmlFirmado?: string;
    qrString?: string;
    hashSeguridad?: string;
  }> {
    console.log(`[FacturacionService - Mock/Inactive] Preparando simulación de firma/emisión para CFE de venta #${cfe.ventaId}`);
    
    const mockCAE: ConstanciaAutorizacionEmision = {
      caeNumero: "990012345678",
      rangoDesde: 1,
      rangoHasta: 10000,
      fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Al estar desactivado o en modo offline simulado, el estado de retorno queda como "Pendiente de activación"
    return {
      estado: EstadoEnvioDGI.PENDIENTE_ACTIVACION,
      numeroAsignado: cfe.numero || 1234, // Secuencia simulada
      serieAsignada: cfe.serie || "A",
      caeUtilizado: mockCAE,
      fechaAutorizacion: new Date().toISOString(),
      xmlFirmado: "<?xml version='1.0' encoding='ISO-8859-1'?><CFE>...CONTENIDO_EN_ESPERA_DE_ACTIVACION...</CFE>",
      qrString: `https://www.dgi.gub.uy/consultaCFE?rut=${MASTER_CONFIG.rutEmisor}&tipo=${cfe.tipoComprobante}&serie=A&numero=1234`,
      hashSeguridad: "dgi_mock_hash_verification_sig"
    };
  }

  async consultarEstadoCFE(serie: string, numero: number, tipo: TipoComprobanteDGI): Promise<EstadoEnvioDGI> {
    console.log(`[FacturacionService] Consultando estado oficial de CFE Serie ${serie} Nro ${numero} Tipo ${tipo}`);
    return EstadoEnvioDGI.PENDIENTE_ACTIVACION;
  }
}

/**
 * SERVICIO COORDINADOR DE FACTURACION ELECTRONICA
 * Se encarga de recibir transacciones del sistema y prepararlas para facturar procesando impuestos y tipos de CFE uruguayos.
 */
export class FacturacionService {
  private pasarela: IProveedorFacturacionPasarela;

  constructor(pasarela?: IProveedorFacturacionPasarela) {
    // Si no se provee pasarela, se utiliza el mock/fachada por defecto. En el futuro, se inyectaría la real aquí.
    this.pasarela = pasarela || new MockProveedorPasarela();
  }

  /**
   * Determina automáticamente el tipo de Comprobante Fiscal uruguayo acorde a los datos del cliente
   * - Si posee un RUT uruguayo válido (12 dígitos numéricos), califica como e-Factura (Tipo 101).
   * - Si posee Cédula uruguaya (CI), pasaporte o no tiene documento especificado, califica como e-Ticket (Tipo 111).
   */
  public determinarTipoComprobante(receptorDocumentoTipo: string, receptorDocumentoNumero: string): TipoComprobanteDGI {
    const isRut = receptorDocumentoTipo?.toUpperCase() === "RUT" || 
                  (receptorDocumentoNumero && receptorDocumentoNumero.trim().length === 12 && !isNaN(Number(receptorDocumentoNumero.trim())));
    return isRut ? TipoComprobanteDGI.E_FACTURA : TipoComprobanteDGI.E_TICKET;
  }

  /**
   * Calcula los desgloses impositivos de Uruguay (Tasa Básica 22%, Tasa Mínima 10%, Exentos)
   * En Uruguay tradicional:
   *  - IVA Básico: 22%
   *  - IVA Mínimo: 10%
   *  - Exento: 0%
   */
  public calcularTasasUruguay(montoTotal: number, tasaIvaPercent: 22 | 10 | 0 = 22): {
    montoNeto: number;
    montoIva: number;
    tasaPorcentaje: number;
  } {
    if (tasaIvaPercent === 0) {
      return { montoNeto: montoTotal, montoIva: 0, tasaPorcentaje: 0 };
    }
    
    // El monto del sistema es total con IVA incluido, se calcula el neto (Monto / 1.XX)
    const factor = tasaIvaPercent === 22 ? 1.22 : 1.10;
    const neto = Number((montoTotal / factor).toFixed(2));
    const iva = Number((montoTotal - neto).toFixed(2));

    return {
      montoNeto: neto,
      montoIva: iva,
      tasaPorcentaje: tasaIvaPercent
    };
  }

  /**
   * Toma una venta realizada en el sistema y crea su estructura de Comprobante Fiscal DGI
   * Guardándolo en la base de datos como "Pendiente de activación".
   * 
   * @param venta El objeto venta interna que se acaba de registrar en Juem.
   * @returns Un objeto ComprobanteFiscalElectronico estructurado, guardado localmente listo para transmisión futura.
   */
  public async prepararComprobanteDesdeVenta(venta: {
    id: number;
    cliente: string;
    total: number;
    fecha?: string;
    lineas?: Array<{ nombre: string; cantidad: number; total: number }>;
    documentoNro?: string;
    documentoTipo?: string;
  }): Promise<ComprobanteFiscalElectronico> {
    
    const docTipo = (venta.documentoTipo as TipoDocumentoReceptor) || TipoDocumentoReceptor.OTROS;
    const docNro = venta.documentoNro || "";
    
    const tipoCFE = this.determinarTipoComprobante(docTipo, docNro);
    
    // Por defecto calculamos IVA Tasa Básica (22%)
    const impuestoCalculado = this.calcularTasasUruguay(venta.total, 22);

    const cfe: ComprobanteFiscalElectronico = {
      ventaId: venta.id,
      tipoComprobante: tipoCFE,
      serie: tipoCFE === TipoComprobanteDGI.E_FACTURA ? "A" : "B",
      numero: 0, // Asignado automáticamente al emitir/activar con DGI
      fechaEmision: venta.fecha || new Date().toISOString(),
      
      emisorRUT: MASTER_CONFIG.rutEmisor,
      emisorNombre: MASTER_CONFIG.razonSocialEmisor,
      
      receptorNombre: venta.cliente || "Consumidor Final / Cliente Directo",
      receptorDocumentoTipo: docTipo,
      receptorDocumentoNumero: docNro,
      
      moneda: "UYU",
      montoNetoNoGravado: 0,
      montoNetoMinimo: 0,
      montoNetoBasico: impuestoCalculado.montoNeto,
      montoIVAMinimo: 0,
      montoIVABasico: impuestoCalculado.montoIva,
      montoTotal: venta.total,
      
      cae: {
        caeNumero: "PENDIENTE_ACTIVACION",
        rangoDesde: 1,
        rangoHasta: 1,
        fechaVencimiento: new Date().toISOString()
      },
      estadoEnvio: EstadoEnvioDGI.PENDIENTE_ACTIVACION,
      qrCodiguera: "",
      hashSeguridad: "pendiente_activacion"
    };

    console.log(`[FacturacionService - INTEGRACION DESACOPLADA] Preparado borrador de Comprobante Fiscal DGI (${tipoCFE === 101 ? 'e-Factura' : 'e-Ticket'}) de $ uruguayos ${cfe.montoTotal} para la venta interna #${venta.id}`);
    
    if (MASTER_CONFIG.activo) {
      // ⚠️ ESTA SECCIÓN SE ACTIVARÁ AUTOMÁTICAMENTE EN EL FUTURO CUANDO MASTER_CONFIG.activo cambie a TRUE.
      // Se comunicará con la pasarela real de DGI para obtener el CAE real, firmar, y realizar la transmisión.
      try {
        const dgiRes = await this.pasarela.firmarYEnviarCFE(cfe);
        cfe.estadoEnvio = dgiRes.estado;
        cfe.numero = dgiRes.numeroAsignado;
        if (dgiRes.serieAsignada) cfe.serie = dgiRes.serieAsignada;
        if (dgiRes.caeUtilizado) cfe.cae = dgiRes.caeUtilizado;
        cfe.fechaAutorizacion = dgiRes.fechaAutorizacion;
        cfe.xmlFirmadoUrl = dgiRes.xmlFirmado;
        cfe.qrCodiguera = dgiRes.qrString;
        cfe.hashSeguridad = dgiRes.hashSeguridad;
      } catch (err) {
        console.error("Error transmitiendo a DGI en producción:", err);
        cfe.estadoEnvio = EstadoEnvioDGI.ERROR_CONEXION;
      }
    } else {
      // Comportamiento local e inactivo por defecto:
      // Se almacena como borrador inactivo sin llamadas externas
      cfe.estadoEnvio = EstadoEnvioDGI.PENDIENTE_ACTIVACION;
    }

    return cfe;
  }
}
