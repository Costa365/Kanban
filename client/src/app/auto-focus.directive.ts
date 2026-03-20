import { AfterViewInit, Directive, ElementRef } from '@angular/core';

@Directive({ selector: '[appAutoFocus]', standalone: false })
export class AutoFocusDirective implements AfterViewInit {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  ngAfterViewInit(): void {
    this.el.nativeElement.focus();
    this.el.nativeElement.select();
  }
}
