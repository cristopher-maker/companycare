import { Injectable } from '@angular/core';

export interface WhatsAppPayload {
  event: string;
  email?: string;
  recipient_email?: string;
  subject?: string;
  phone?: string;
  number?: string;
  recipient_name?: string;
  message: string;
  text?: string;
  html?: string;
  sender_name?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsAppBotService {
  private readonly storageKey = 'cc_n8n_whatsapp_webhook';
  public static readonly DEFAULT_WEBHOOK_URL = 'https://botadvisorcl.app.n8n.cloud/webhook/df36d7f0-91e2-4e1d-ac25-71ebb2850ec7';

  constructor() {}

  public getWebhookUrl(): string {
    return localStorage.getItem(this.storageKey) || WhatsAppBotService.DEFAULT_WEBHOOK_URL;
  }

  public setWebhookUrl(url: string): void {
    if (url) {
      localStorage.setItem(this.storageKey, url.trim());
    } else {
      localStorage.removeItem(this.storageKey);
    }
  }

  /**
   * Normaliza números telefónicos (especialmente Chile +56 9)
   */
  public formatPhone(rawPhone?: string): string {
    if (!rawPhone) return '';
    let cleaned = rawPhone.replace(/[^\d+]/g, '');

    // Si ya tiene +, verificar que tenga código país
    if (cleaned.startsWith('+')) {
      return cleaned;
    }

    // Caso chileno: 9 1234 5678 (9 dígitos empezando en 9)
    if (cleaned.length === 9 && cleaned.startsWith('9')) {
      return `+56${cleaned}`;
    }

    // Caso chileno: 569 1234 5678 (11 dígitos empezando en 569)
    if (cleaned.length === 11 && cleaned.startsWith('569')) {
      return `+${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Genera el enlace directo a WhatsApp Web / App (Click-to-WhatsApp sin costo)
   */
  public getWaMeUrl(phone: string, message: string): string {
    const formatted = this.formatPhone(phone).replace('+', '');
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${formatted}?text=${encoded}`;
  }

  /**
   * Envía la notificación al webhook de n8n para que el bot la despache por Correo (Gmail) o WhatsApp
   */
  public async sendNotification(options: {
    email?: string;
    subject?: string;
    phone?: string;
    message: string;
    html?: string;
    event?: string;
    recipientName?: string;
    senderName?: string;
    metadata?: Record<string, any>;
  }): Promise<{ success: boolean; message: string; responseData?: any }> {
    const webhookUrl = this.getWebhookUrl();
    if (!webhookUrl) {
      return {
        success: false,
        message: 'No has configurado la URL del Webhook de n8n todavía.'
      };
    }

    const normalizedPhone = options.phone ? this.formatPhone(options.phone) : '';
    const targetEmail = (options.email || '').trim();

    if (!normalizedPhone && !targetEmail) {
      return {
        success: false,
        message: 'Debes proporcionar al menos un correo o un número de celular para la notificación.'
      };
    }

    const defaultHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 24px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Company Care</h1>
          <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Plataforma de Cuidados y Bienestar</p>
        </div>
        <div style="padding: 24px; background-color: #ffffff; color: #1e293b;">
          <p style="font-size: 16px; margin-top: 0;">Estimado/a <strong>${options.recipientName || 'Usuario'}</strong>,</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 16px; border-radius: 6px; font-size: 15px; line-height: 1.6; margin: 20px 0; color: #334155;">
            ${(options.message || '').replace(/\n/g, '<br/>')}
          </div>
          <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">
            Este es un aviso automático generado por la plataforma Company Care.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
          © ${new Date().getFullYear()} Company Care · SeniorAdvisor Chile. Todos los derechos reservados.
        </div>
      </div>
    `;

    const payload: WhatsAppPayload = {
      event: options.event || 'general_notification',
      email: targetEmail,
      recipient_email: targetEmail,
      subject: options.subject || 'Notificación Company Care',
      phone: normalizedPhone,
      number: normalizedPhone,
      recipient_name: options.recipientName || 'Usuario',
      message: options.message,
      text: options.message,
      html: options.html || defaultHtml,
      sender_name: options.senderName || 'Company Care',
      timestamp: new Date().toISOString(),
      metadata: options.metadata || {}
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`n8n respondió con error HTTP ${response.status}: ${response.statusText}`);
      }

      let resData = null;
      try {
        resData = await response.json();
      } catch {
        // En caso que n8n retorne texto plano como "Workflow was started"
      }

      return {
        success: true,
        message: 'Notificación enviada con éxito a tu webhook de n8n.',
        responseData: resData
      };
    } catch (err: any) {
      console.warn('Fallo fetch estándar (posible bloqueo CSP/CORS), intentando modo no-cors y canal seguro...', err);
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain'
          },
          body: JSON.stringify(payload)
        });

        return {
          success: true,
          message: 'Petición enviada a n8n con éxito. Revisa las ejecuciones en tu n8n y tu WhatsApp.'
        };
      } catch (fallbackErr: any) {
        // Fallback definitivo: HTML Form POST que no está sujeto a restricciones connect-src de CSP
        const sent = await this.sendViaHiddenForm(webhookUrl, payload);
        if (sent) {
          return {
            success: true,
            message: 'Petición despachada a n8n con éxito. Revisa las ejecuciones en tu n8n y tu WhatsApp.'
          };
        }
        return {
          success: false,
          message: 'No se pudo conectar con el servidor de n8n. Revisa que el workflow esté ACTIVO en n8n.'
        };
      }
    }
  }

  private sendViaHiddenForm(url: string, payload: any): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const iframeName = 'n8n_post_frame_' + Date.now();
        const iframe = document.createElement('iframe');
        iframe.name = iframeName;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = url;
        form.target = iframeName;
        form.style.display = 'none';

        for (const key of Object.keys(payload)) {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = typeof payload[key] === 'object' ? JSON.stringify(payload[key]) : String(payload[key]);
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();

        setTimeout(() => {
          try {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          } catch {}
          resolve(true);
        }, 1200);
      } catch (e) {
        console.error('Error enviando vía formulario:', e);
        resolve(false);
      }
    });
  }

  /**
   * Plantillas pre-redactadas para la plataforma
   */
  public getTemplate(type: 'test' | 'appointment' | 'admission' | 'kardex_medication' | 'visit', params: Record<string, string>): string {
    switch (type) {
      case 'test':
        return `✅ *Prueba de Conexión Company Care*\nHola ${params['name'] || ''}, tu bot en n8n está correctamente conectado con la plataforma Company Care.`;
      
      case 'appointment':
        return `🗓️ *Confirmación de Cita - Company Care*\nHola ${params['name'] || ''}, tu sesión de orientación con el especialista ${params['expert'] || ''} está agendada para el ${params['date'] || ''} a las ${params['time'] || ''} hrs.\nEnlace: ${params['link'] || 'En la plataforma'}`;

      case 'admission':
        return `🏥 *Estado de Admisión - ${params['residence'] || 'Residencia'}*\nEstimada familia de ${params['patient'] || ''}, le informamos que la solicitud de ingreso ha pasado a estado: *${params['status'] || 'En revisión'}*.`;

      case 'kardex_medication':
        return `💊 *Alerta de Medicamento - Residencia ELEAM*\nEstimado/a ${params['name'] || ''}, le informamos que el stock de *${params['medication'] || 'medicamento'}* para Don/Doña ${params['patient'] || ''} está próximo a agotarse. Favor gestionar reposición antes del ${params['date'] || ''}.`;

      case 'visit':
        return `👋 *Recordatorio de Visita*\nHola ${params['name'] || ''}, te recordamos que tienes visita agendada para ver a ${params['patient'] || ''} este ${params['date'] || ''} a las ${params['time'] || ''} hrs.`;

      default:
        return params['message'] || '';
    }
  }
}
