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

  transform(value: string): SafeResourceUrl {
    if (!value) return '';

    // Validate protocol — only HTTPS is allowed
    if (!value.startsWith('https://')) {
      console.warn('[TrustUrlPipe] Blocked non-HTTPS URL:', value);
      return '';
    }

    // Validate domain against whitelist
    try {
      const url = new URL(value);
      const isTrusted = TRUSTED_ORIGINS.some(origin => url.origin === origin);
      if (!isTrusted) {
        console.warn('[TrustUrlPipe] Blocked untrusted origin:', url.origin);
        return '';
      }
    } catch {
      console.warn('[TrustUrlPipe] Blocked invalid URL:', value);
      return '';
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(value);
  }
}
