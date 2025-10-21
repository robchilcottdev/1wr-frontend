import { Directive, HostListener } from '@angular/core';

@Directive({
  selector: '[appRestrictStoryword]'
})
export class RestrictStoryword {
  @HostListener('keydown.space', ['$event'])
  onSpace(event: Event) {
    event.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    let pasteData = event.clipboardData?.getData('text') ?? '';
    if (pasteData.length > 19){
      pasteData = pasteData.slice(0, 19);
    }
    if (pasteData.includes(' ')) {
      event.preventDefault();
      pasteData = pasteData.replace(/\s+/g, '');
      document.execCommand('insertText', false, pasteData);
    }
  }
}
