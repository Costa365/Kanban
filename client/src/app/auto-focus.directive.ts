import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[appAutoFocus]', standalone: false })
export class AutoFocusDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLTextAreaElement>) {}

  ngAfterViewInit(): void {
    const el = this.el.nativeElement;
    el.focus();
    el.select();
    queueMicrotask(() => {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    });
  }
}
