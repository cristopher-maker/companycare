import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

/** Whitelisted origins for iframe embeds. */
const TRUSTED_ORIGINS = [
  'https://www.youtube.com',
  'https://youtube.com',
  'https://www.youtube-nocookie.com',
  'https://player.vimeo.com',
  'https://vimeo.com',
  'https://ddysqiaeojmlziesndgh.supabase.co',
];

@Pipe({
  name: 'trustUrl'
})
export class TrustUrlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined): SafeResourceUrl {
    if (!value) return '';

    const trimmed = String(value).trim();
    if (!trimmed) return '';

    // 1. Allow local app assets (e.g. assets/pdf/..., /assets/..., ./assets/...)
    if (
      trimmed.startsWith('assets/') ||
      trimmed.startsWith('/assets/') ||
      trimmed.startsWith('./assets/') ||
      trimmed.includes('/assets/pdf/') ||
      trimmed.endsWith('.pdf')
    ) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(trimmed);
    }

    // 2. Allow same-origin / relative URLs
    try {
      if (typeof window !== 'undefined' && window.location) {
        if (trimmed.startsWith(window.location.origin)) {
          return this.sanitizer.bypassSecurityTrustResourceUrl(trimmed);
        }
      }
    } catch {
      // ignore
    }

    // 3. Absolute URLs require HTTPS
    if (!trimmed.startsWith('https://')) {
      console.warn('[TrustUrlPipe] Blocked non-HTTPS URL:', trimmed);
      return '';
    }

    // 4. Validate domain against trusted whitelist or recognized domains
    try {
      const url = new URL(trimmed);
      const isTrusted =
        TRUSTED_ORIGINS.some(origin => url.origin === origin) ||
        url.hostname.endsWith('.supabase.co') ||
        url.hostname.endsWith('.github.io') ||
        url.hostname === 'localhost' ||
        url.hostname === '127.0.0.1';

      if (!isTrusted) {
        console.warn('[TrustUrlPipe] Blocked untrusted origin:', url.origin);
        return '';
      }
    } catch {
      console.warn('[TrustUrlPipe] Blocked invalid URL:', trimmed);
      return '';
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(trimmed);
  }
}

